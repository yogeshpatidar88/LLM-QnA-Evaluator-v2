import React, { useState } from 'react';
import axios from 'axios';
import { Send, MessageCircle, ThumbsUp, ThumbsDown, AlertCircle, Loader, BarChart3, TrendingUp, Scale, Brain } from 'lucide-react';
import './App.css';

// Your Railway backend URL
const API_BASE_URL = 'https://llm-qna-evaluator-v2-production.up.railway.app/api';

const formatAnswerText = (text) => {
  if (!text) return '';
  
  return text
    // Convert **bold** to <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert bullet points starting with * to proper list items
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    // Wrap consecutive list items in <ul>
    .replace(/(<li>.*<\/li>)/gs, (match) => {
      const items = match.split('</li>').filter(item => item.trim());
      return '<ul>' + items.map(item => item + '</li>').join('') + '</ul>';
    })
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>')
    // Convert headings (### to h3, ## to h2, # to h1)
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Convert numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Handle code blocks with backticks
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Handle superscript
    .replace(/<sup>(.*?)<\/sup>/g, '<sup>$1</sup>');
};

function App() {
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/ask`, {
        question: question.trim()
      });

      const newConversation = {
        id: Date.now(),
        question: question.trim(),
        answer: response.data.answer,
        evaluation: response.data.evaluation,
        timestamp: new Date().toLocaleString()
      };

      setConversations(prev => [newConversation, ...prev]);
      setQuestion('');
    } catch (err) {
      setError('Failed to get answer. Please check your connection.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'GOOD':
        return <ThumbsUp className="quality-icon good" />;
      case 'BAD':
        return <ThumbsDown className="quality-icon bad" />;
      default:
        return <AlertCircle className="quality-icon error" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 7) return 'score-excellent';
    if (score >= 5) return 'score-good';
    if (score >= 3) return 'score-average';
    return 'score-poor';
  };

  const getMetricColor = (value) => {
    if (value >= 0.7) return 'metric-excellent';
    if (value >= 0.5) return 'metric-good';
    if (value >= 0.3) return 'metric-average';
    return 'metric-poor';
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-info">
            <Scale className="header-icon" />
            <div>
              <h1 className="header-title">LLM-as-a-Judge Q&A Evaluator</h1>
              <p className="header-subtitle">AI-powered evaluation using LLM-as-a-Judge + ROUGE & BLEU metrics</p>
            </div>
            <div className="method-badge">
              <Brain className="method-icon" />
              <span>LLM Judge</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Question Input */}
        <div className="input-section">
          <div className="input-container">
            <div className="textarea-container">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your question here... (Press Enter to submit, Shift+Enter for new line)"
                className="question-textarea"
                rows="3"
                disabled={loading}
              />
            </div>
            <button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              className={`ask-button ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <Loader className="button-icon spinning" />
              ) : (
                <Send className="button-icon" />
              )}
              {loading ? 'Processing...' : 'Evaluate'}
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="conversations">
          {conversations.map((conv) => (
            <div key={conv.id} className="conversation-card">
              {/* Question */}
              <div className="question-section">
                <div className="question-header">
                  <div className="question-avatar">
                    <MessageCircle className="avatar-icon" />
                  </div>
                  <div className="question-content">
                    <h3 className="section-title">Question</h3>
                    <p className="question-text">{conv.question}</p>
                    <p className="timestamp">{conv.timestamp}</p>
                  </div>
                </div>
              </div>

              {/* Answer */}
              <div className="answer-section">
                <h3 className="section-title">Answer</h3>
                <div className="answer-content">
                  <div 
                    className="answer-text-formatted" 
                    dangerouslySetInnerHTML={{
                      __html: formatAnswerText(conv.answer)
                    }}
                  />
                </div>
              </div>

              {/* Evaluation */}
              {conv.evaluation && conv.evaluation.quality !== 'ERROR' && (
                <div className={`evaluation-section ${conv.evaluation.quality.toLowerCase()}`}>
                  {/* LLM Judge Header */}
                  <div className="llm-judge-header">
                    <Scale className="judge-icon" />
                    <div className="judge-info">
                      <h3 className="judge-title">LLM-as-a-Judge Evaluation</h3>
                      <span className="judge-model">
                        {conv.evaluation.judge_model || 'Gemini Judge'} • 
                        Confidence: {conv.evaluation.judge_confidence || 0}/10
                      </span>
                    </div>
                    <div className="judge-verdict">
                      {getQualityIcon(conv.evaluation.llm_judge_verdict || conv.evaluation.quality)}
                      <span className="verdict-text">
                        {conv.evaluation.llm_judge_verdict || conv.evaluation.quality}
                      </span>
                    </div>
                  </div>

                  {/* Overall Score */}
                  <div className="overall-score">
                    <span className="score-badge large">
                      Overall Quality: {conv.evaluation.score}/10
                    </span>
                    <span className="evaluation-method">
                      Method: {conv.evaluation.evaluation_method || 'LLM-as-a-Judge + NLP Metrics'}
                    </span>
                  </div>

                  {/* LLM Judge Detailed Scores */}
                  <div className="detailed-scores">
                    <h4 className="scores-title">
                      <Brain className="brain-icon" />
                      LLM Judge Detailed Assessment
                    </h4>
                    <div className="score-grid">
                      <div className="score-item">
                        <span className="score-label">Content Depth</span>
                        <span className={`score-value ${getScoreColor(conv.evaluation.content_depth || 0)}`}>
                          {conv.evaluation.content_depth || 0}/10
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Actionability</span>
                        <span className={`score-value ${getScoreColor(conv.evaluation.actionability || 0)}`}>
                          {conv.evaluation.actionability || 0}/10
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Clarity</span>
                        <span className={`score-value ${getScoreColor(conv.evaluation.clarity || 0)}`}>
                          {conv.evaluation.clarity || 0}/10
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Comprehensiveness</span>
                        <span className={`score-value ${getScoreColor(conv.evaluation.comprehensiveness || 0)}`}>
                          {conv.evaluation.comprehensiveness || 0}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Objective NLP Metrics */}
                  {conv.evaluation.metrics_summary && (
                    <div className="metrics-section">
                      <div className="metrics-header">
                        <TrendingUp className="metrics-icon" />
                        <h4 className="metrics-title">Objective NLP Metrics</h4>
                        <span className="metrics-note">(Supporting Evidence)</span>
                      </div>
                      <div className="metrics-grid">
                        <div className="metric-item">
                          <span className="metric-label">Overall Similarity</span>
                          <span className={`metric-value ${getMetricColor(conv.evaluation.metrics_summary.overall_similarity)}`}>
                            {(conv.evaluation.metrics_summary.overall_similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">ROUGE-1</span>
                          <span className={`metric-value ${getMetricColor(conv.evaluation.metrics_summary.rouge1_fmeasure)}`}>
                            {(conv.evaluation.metrics_summary.rouge1_fmeasure * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">ROUGE-L</span>
                          <span className={`metric-value ${getMetricColor(conv.evaluation.metrics_summary.rougeL_fmeasure)}`}>
                            {(conv.evaluation.metrics_summary.rougeL_fmeasure * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">BLEU</span>
                          <span className={`metric-value ${getMetricColor(conv.evaluation.metrics_summary.bleu_score)}`}>
                            {(conv.evaluation.metrics_summary.bleu_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="metrics-interpretation">
                        📝 {conv.evaluation.metrics_summary.interpretation}
                      </p>
                    </div>
                  )}

                  <div className="evaluation-content">
                    <div className="reasoning-section">
                      <h4 className="subsection-title">
                        <Brain className="reasoning-icon" />
                        LLM Judge Reasoning
                      </h4>
                      <p className="reasoning-text">{conv.evaluation.reasoning}</p>
                    </div>

                    <div className="details-section">
                      {conv.evaluation.strengths && conv.evaluation.strengths.length > 0 && (
                        <div className="strengths">
                          <h4 className="subsection-title strengths-title">✨ Identified Strengths</h4>
                          <ul className="details-list">
                            {conv.evaluation.strengths.map((strength, index) => (
                              <li key={index} className="detail-item strength-item">
                                <span className="bullet">•</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {conv.evaluation.missing_elements && conv.evaluation.missing_elements.length > 0 && (
                        <div className="improvements">
                          <h4 className="subsection-title improvements-title">🔧 Improvement Suggestions</h4>
                          <ul className="details-list">
                            {conv.evaluation.missing_elements.map((element, index) => (
                              <li key={index} className="detail-item improvement-item">
                                <span className="bullet">•</span>
                                <span>{element}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {conv.evaluation && conv.evaluation.quality === 'ERROR' && (
                <div className="evaluation-section error">
                  <div className="evaluation-header">
                    <AlertCircle className="quality-icon error" />
                    <h3 className="section-title">LLM Judge Error</h3>
                  </div>
                  <p className="error-text">{conv.evaluation.reasoning}</p>
                </div>
              )}
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="empty-state">
              <Scale className="empty-icon" />
              <h3 className="empty-title">Ready for LLM-as-a-Judge Evaluation</h3>
              <p className="empty-description">
                Ask your first question to see advanced AI evaluation using the LLM-as-a-Judge methodology!
              </p>
              <div className="methodology-info">
                <h4>🏛️ LLM-as-a-Judge Features:</h4>
                <ul>
                  <li>Expert-level qualitative assessment</li>
                  <li>Detailed reasoning and confidence scores</li>
                  <li>Combined with objective NLP metrics (ROUGE, BLEU)</li>
                  <li>Consistent evaluation criteria</li>
                </ul>
              </div>
              <div className="example-questions">
                <p>Try questions like:</p>
                <ul>
                  <li>"How do I improve team productivity?"</li>
                  <li>"What's the best deployment strategy?"</li>
                  <li>"How to debug performance issues?"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
