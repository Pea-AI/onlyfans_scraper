document.addEventListener('DOMContentLoaded', function() {
  const scrapeButton = document.getElementById('scrapeButton');
  const statusDiv = document.getElementById('status');
  const maxPostsInput = document.getElementById('maxPosts');

  scrapeButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('onlyfans.com')) {
        showStatus('请在OnlyFans博主页面使用此扩展', 'error');
        return;
      }

      const maxPosts = parseInt(maxPostsInput.value) || 50;

      chrome.tabs.sendMessage(tab.id, { 
        action: 'scrape',
        maxPosts: maxPosts
      }, response => {
        if (response && response.success) {
          showStatus('抓取成功！' + response.result.info.username, 'success');
        } else {
          showStatus('抓取失败，请重试', 'error');
        }
      });
    } catch (error) {
      showStatus('发生错误：' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    // setTimeout(() => {
    //   statusDiv.style.display = 'none';
    // }, 3000);
  }
}); 