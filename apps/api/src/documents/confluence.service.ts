import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ConfluenceService {
  private readonly logger = new Logger(ConfluenceService.name);

  async getPage(
    siteUrl: string,
    email: string,
    apiToken: string,
    pageId: string,
  ): Promise<{ title: string; content: string }> {
    // Ensure protocol
    if (!siteUrl.startsWith('http')) {
      siteUrl = `https://${siteUrl}`;
    }
    // Remove trailing slash
    siteUrl = siteUrl.replace(/\/$/, '');

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    try {
      const response = await axios.get(
        `${siteUrl}/wiki/rest/api/content/${pageId}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
          params: {
            expand: 'body.storage',
          },
        },
      );

      const data = response.data;
      const title = data.title;
      // Basic HTML content - in a real app, we'd use a library to convert this HTML to nice Markdown
      // For MVP, we'll store the HTML or strip tags roughly.
      // Let's try to convert simple tags to text.
      const content = this.cleanHtml(data.body.storage.value);

      return { title, content };
    } catch (error: any) {
      this.logger.error(
        `Confluence fetch failed: ${error.message}`,
        error.response?.data,
      );
      throw new BadRequestException('Failed to fetch from Confluence');
    }
  }

  private cleanHtml(html: string): string {
    // Very basic strip tags for MVP.
    // In prod, use 'turndown' or 'cheerio'
    return html
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
