const axios = require('axios');

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:5001';

/**
 * POST /api/chat
 * Forward user question to FastAPI RAG and return answer
 */
const sendChatMessage = async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id; // From authMiddleware

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required.',
      });
    }

    // Call FastAPI RAG endpoint
    const ragResponse = await axios.post(`${RAG_API_URL}/api/chat`, {
      question: question.trim(),
      user_id: userId,
    });

    return res.status(200).json({
      success: true,
      question: ragResponse.data.question,
      answer: ragResponse.data.answer,
      sources: ragResponse.data.sources || [],
      llm_comparison: ragResponse.data.llm_comparison || {},
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Chat error:', err.message);

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'RAG service is unavailable. Please try again later.',
      });
    }

    return res.status(500).json({
      success: false,
      message: err.response?.data?.detail || 'Failed to process your question.',
    });
  }
};

module.exports = { sendChatMessage };
