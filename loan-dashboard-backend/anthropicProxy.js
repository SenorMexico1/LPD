// backend/anthropicProxy.js - Complete backend proxy server for Anthropic API
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for large loan data

// Store API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasApiKey: !!ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { prompt, model = 'claude-3-5-sonnet-20241022', analysisType } = req.body;
  
  // Validate API key
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in .env file.' 
    });
  }
  
  // Validate prompt
  if (!prompt) {
    return res.status(400).json({ 
      error: 'Prompt is required' 
    });
  }
  
  // Log analysis request (without sensitive data)
  console.log(`[${new Date().toISOString()}] Analysis request:`, {
    model,
    analysisType,
    promptLength: prompt.length
  });
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errorText);
      
      // Parse and return cleaner error message
      try {
        const errorData = JSON.parse(errorText);
        return res.status(response.status).json({ 
          error: errorData.error?.message || `Anthropic API error: ${response.status}` 
        });
      } catch {
        return res.status(response.status).json({ 
          error: `Anthropic API error: ${response.status}` 
        });
      }
    }
    
    const result = await response.json();
    
    // Log successful analysis
    console.log(`[${new Date().toISOString()}] Analysis successful:`, {
      model,
      analysisType,
      outputLength: result.content?.[0]?.text?.length || 0
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to process request. Please check server logs.' 
    });
  }
});

// News search endpoint (optional - can use mock data or real news API)
app.post('/api/search-news', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  // Option 1: Use NewsAPI (requires NEWS_API_KEY in .env)
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  
  if (NEWS_API_KEY) {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5&language=en`,
        {
          headers: {
            'X-Api-Key': NEWS_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const articles = data.articles.map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          imageUrl: article.urlToImage
        }));
        
        return res.json({ articles });
      }
    } catch (error) {
      console.error('News API error:', error);
    }
  }
  
  // Option 2: Return mock news data if no API key
  const mockArticles = [
    {
      title: `Latest trends in ${query}`,
      description: 'Industry analysis shows significant changes in lending patterns for this sector.',
      url: 'https://example.com/article1',
      source: 'Financial Times',
      publishedAt: new Date().toISOString()
    },
    {
      title: `${query} sector performance update`,
      description: 'Recent data indicates better than expected outcomes in specialized lending segments.',
      url: 'https://example.com/article2',
      source: 'Bloomberg',
      publishedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      title: `Risk factors in ${query} lending`,
      description: 'Analysts highlight key indicators affecting loan performance in this sector.',
      url: 'https://example.com/article3',
      source: 'Reuters',
      publishedAt: new Date(Date.now() - 172800000).toISOString()
    }
  ];
  
  res.json({ articles: mockArticles });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Anthropic Proxy Server Started           ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   API Key: ${ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not Set'}           ║
║   CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}     ║
╚════════════════════════════════════════════╝

${!ANTHROPIC_API_KEY ? `
⚠️  WARNING: No API key configured!
   Add ANTHROPIC_API_KEY to your .env file:
   ANTHROPIC_API_KEY= "example-key"
` : '✅ Ready to process analysis requests'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});