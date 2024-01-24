  // Simulate opening the chat interface when a card is clicked
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function() {
      const chatContainer = document.getElementById('chat-container')
      chatContainer.style.display = 'flex';
      chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      chatContainer.style.backdropFilter = 'blur(10px)';
    });
  });
  