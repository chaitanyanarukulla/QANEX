import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { aiConfig } from '../config/ai.config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LocalModelGateway {
    private readonly logger = new Logger(LocalModelGateway.name);

    constructor(private readonly httpService: HttpService) { }

    async complete(params: {
        model: string;
        prompt: string;
        maxTokens: number;
        temperature: number;
    }): Promise<string> {
        const url = `${aiConfig.local.llmBaseUrl}/chat/completions`;
        const payload = {
            model: params.model,
            messages: [{ role: 'user', content: params.prompt }],
            max_tokens: params.maxTokens,
            temperature: params.temperature,
            stream: false,
        };

        try {
            const { data } = await firstValueFrom(this.httpService.post(url, payload));
            // Assuming OpenAI-compatible response structure
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.error(`Error calling local LLM at ${url}: ${error.message}`, error.stack);
            throw new Error('Failed to complete prompt with local LLM');
        }
    }

    async embed(params: {
        model: string;
        inputs: string[];
    }): Promise<number[][]> {
        const url = `${aiConfig.local.embeddingBaseUrl}/embeddings`;
        const payload = {
            model: params.model,
            input: params.inputs,
        };

        try {
            const { data } = await firstValueFrom(this.httpService.post(url, payload));
            // Assuming OpenAI-compatible response structure
            // data.data is an array of objects { embedding: number[], ... }
            return data.data.map((item: any) => item.embedding);
        } catch (error) {
            this.logger.error(`Error calling local Embedding at ${url}: ${error.message}`, error.stack);
            throw new Error('Failed to generate embeddings with local model');
        }
    }
}
