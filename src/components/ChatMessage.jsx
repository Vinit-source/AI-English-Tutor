import { useState } from 'react';
import '../styles/ChatMessage.css';

const ChatMessage = ({ type, content, isPractice = false }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  // Format the time with a more readable format and better contrast
  const formatMessageTime = () => {
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true // Use 12-hour format with AM/PM
    };
    return new Date().toLocaleTimeString([], options);
  };

  // For AI "thinking" indicator
  if (type === 'thinking') {
    return (
      <div className="ai-message">
        <div className="message-avatar ai-avatar">AI</div>
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  // For user messages
  if (type === 'user') {
    return (
      <div className="user-message">
        <div className={`user-message-content ${isPractice ? 'is-practice' : ''}`}>
          {content}
          <div className="message-time">
            {formatMessageTime()}
          </div>
        </div>
      </div>
    );
  }

  // For AI messages
  if (type === 'ai') {
    // Extract translation part
    const translationRegex = /\((.*?)\)/g;
    let translatedText = "";
    let matches;
    let englishText = content;

    // Extract translations
    while ((matches = translationRegex.exec(content)) !== null) {
      translatedText += matches[1] + " ";
    }

    // Remove translations from the English text
    englishText = content.replace(translationRegex, "").trim();

    // Check for correction pattern
    // Look for phrases like "you should say", "correct way to say", "try saying" etc.
    const correctionPatterns = [
      "you should say", "the correct way", "try saying", 
      "we usually say", "it's better to say", "more natural to say",
      "you can say", "correct sentence is"
    ];

    let hasCorrection = false;
    let englishMain = englishText;
    let correctionText = "";

    correctionPatterns.forEach(pattern => {
      if (englishText.toLowerCase().includes(pattern.toLowerCase())) {
        hasCorrection = true;

        // Split at the correction point and extract the suggested correction
        const parts = englishText.split(new RegExp(pattern, 'i'));

        if (parts.length > 1) {
          englishMain = parts[0].trim();
          
          // Extract the correction from the second part
          const secondPart = parts[1];
          
          // First try to find text in quotes
          const quoteMatch = secondPart.match(/["'](.*?)["']/);
          
          if (quoteMatch) {
            correctionText = quoteMatch[1].trim();
          } else {
            // If no quotes, look for text until a sentence end or explanation starts
            const correctionEnd = secondPart.search(/[.!?]|(\sbecause\s|\sas\s|\ssince\s)/i);
            if (correctionEnd !== -1) {
              correctionText = secondPart.substring(0, correctionEnd).trim();
            } else {
              // If no clear end, take the whole remainder but limit to reasonable length
              correctionText = secondPart.trim().split(/\s+/).slice(0, 10).join(' ');
            }
          }
          
          // Clean up the correction text
          correctionText = correctionText
            .replace(/^[:"'\s]+|[:"'\s]+$/g, '') // Remove quotes and extra spaces
            .replace(/\s+/g, ' '); // Normalize whitespace
        }
      }
    });

    return (
      <div className="ai-message">
        <div className="message-avatar ai-avatar">AI</div>
        <div className={`ai-message-content ${hasCorrection ? 'has-correction' : ''}`}>
          {/* Main English response */}
          <div className="english-message">
            {englishMain}

            {/* Translation toggle button */}
            {translatedText && (
              <button
                className="hint-button"
                onClick={() => setShowTranslation(!showTranslation)}
                aria-label={showTranslation ? "Hide translation" : "Show translation"}
                title={showTranslation ? "Hide translation" : "Show translation"}
              >
                💡
              </button>
            )}
          </div>

          {/* Correction section */}
          {hasCorrection && (
            <div className="correction-section">
              <div className="correction-header" onClick={() => setShowCorrection(!showCorrection)}>
                <span>Suggested correction</span>
                <button className="toggle-btn" aria-label="Toggle correction details">
                  {showCorrection ? '▼' : '▶'}
                </button>
              </div>

              {showCorrection && (
                <div className="correction-text">
                  <span className="correct-phrase">"{correctionText}"</span>
                  <button 
                    className="practice-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.enterPracticeMode) {
                        window.enterPracticeMode(correctionText);
                      }
                    }}
                    aria-label="Practice this correction"
                  >
                    Practice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Translation section */}
          {translatedText && showTranslation && (
            <div className="translation-message">
              {translatedText}
            </div>
          )}

          <div className="message-time">
            {formatMessageTime()}
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return <div className={`${type}-message`}>{content}</div>;
};

export default ChatMessage;
