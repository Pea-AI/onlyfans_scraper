document.addEventListener('DOMContentLoaded', function () {
  const scrapeButton = document.getElementById('scrapeButton')
  const statusDiv = document.getElementById('status')
  const maxPostsInput = document.getElementById('maxPosts')
  const progressDiv = document.getElementById('progress')
  const scrapedCountSpan = document.getElementById('scrapedCount')
  const totalCountSpan = document.getElementById('totalCount')
  const progressBar = document.getElementById('progressBar')

  let isScraping = false

  // 监听来自content script的进度更新消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'progress' && isScraping) {
      updateProgress(message.scraped, message.total)
    }
  })

  scrapeButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab.url.includes('onlyfans.com')) {
        showStatus('请在OnlyFans博主页面使用此扩展', 'error')
        return
      }

      const maxPosts = parseInt(maxPostsInput.value) || 50

      // 重置并显示进度条
      isScraping = true
      progressDiv.style.display = 'block'
      updateProgress(0, maxPosts)
      scrapeButton.disabled = true
      statusDiv.style.display = 'none'

      chrome.tabs.sendMessage(
        tab.id,
        {
          action: 'scrape',
          maxPosts: maxPosts
        },
        (response) => {
          isScraping = false
          if (response && response.success) {
            showStatus('抓取成功！' + response.result.info.username, 'success')
          } else {
            showStatus('抓取失败，请重试', 'error')
          }
          scrapeButton.disabled = false
          // 3秒后隐藏进度条
          setTimeout(() => {
            progressDiv.style.display = 'none'
          }, 3000)
        }
      )
    } catch (error) {
      isScraping = false
      showStatus('发生错误：' + error.message, 'error')
      scrapeButton.disabled = false
      progressDiv.style.display = 'none'
    }
  })

  function updateProgress(scraped, total) {
    requestAnimationFrame(() => {
      scrapedCountSpan.textContent = scraped
      totalCountSpan.textContent = total
      const percentage = (scraped / total) * 100
      progressBar.style.width = `${percentage}%`
    })
  }

  function showStatus(message, type) {
    statusDiv.textContent = message
    statusDiv.className = type
    statusDiv.style.display = 'block'
  }
})
