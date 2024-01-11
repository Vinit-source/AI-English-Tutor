  // Simulate opening the chat interface when a card is clicked
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function() {
      document.getElementById('chat-container').style.display = 'flex';
    });
  });
  