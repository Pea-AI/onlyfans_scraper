// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    scrapeInfoAndPosts(request.maxPosts)
      .then((result) => {
        // 下载数据为JSON文件
        const username = window.location.pathname.split('/')[1]
        const dataStr = JSON.stringify(result, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `onlyfans_${username}_posts_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        sendResponse({ success: true, result })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true // 保持消息通道开放
  } else if (request.action === 'pause') {
    window.isScrapingPaused = true
    return true
  } else if (request.action === 'resume') {
    window.isScrapingPaused = false
    return true
  }
})

async function scrapeInfoAndPosts(maxPosts = 50) {
  const posts = []
  let lastHeight = document.documentElement.scrollHeight
  window.isScrapingPaused = false

  const username = window.location.pathname.split('/')[1]

  const info = {
    id: undefined,
    username: username,
    nickname: undefined,
    avatar: undefined,
    about: undefined
  }

  // 获取博主信息
  try {
    // 获取昵称
    const nameElement = document.querySelector(
      '.b-profile__names .b-username .g-user-name'
    )
    if (nameElement) {
      // 克隆元素以避免修改原始DOM
      const clone = nameElement.cloneNode(true)
      // 移除验证图标
      const verifiedIcon = clone.querySelector('.m-verified')
      if (verifiedIcon) {
        verifiedIcon.remove()
      }
      info.nickname = clone.textContent.trim()
    }

    // 获取头像
    const avatarElement = document.querySelector('.g-avatar__img-wrapper img')
    if (avatarElement) {
      info.avatar = avatarElement.src
    }

    // 获取个人简介
    const aboutElement = document.querySelector('.b-user-info__text')
    if (aboutElement) {
      info.about = aboutElement.textContent.trim()
    }

    // 获取博主ID
    const chatLink = document.querySelector('a[href*="/my/chats/chat/"]')
    if (chatLink) {
      const href = chatLink.getAttribute('href')
      const match = href.match(/\/my\/chats\/chat\/(\d+)/)
      if (match) {
        info.id = match[1]
      }
    }
  } catch (error) {
    console.error('获取博主信息时出错:', error)
  }

  // 滚动到底部以加载更多内容
  while (true) {
    // 检查是否暂停
    while (window.isScrapingPaused) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.floor(Math.random() * 3000))
    )

    const newHeight = document.documentElement.scrollHeight
    if (newHeight === lastHeight) break
    lastHeight = newHeight

    // 获取所有帖子元素
    const postElements = document.querySelectorAll('.b-post')

    if (posts.length >= maxPosts) {
      break
    }

    for (const post of postElements) {
      // 检查是否暂停
      while (window.isScrapingPaused) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      try {
        if (posts.length >= maxPosts) {
          break
        }
        const postId = post.id.replace('postId_', '')
        const dateElement = post.querySelector('.b-post__date span')
        const timestamp = dateElement ? dateElement.getAttribute('title') : null
        const textElement = post.querySelector('.b-post__text-el')
        const text = textElement ? textElement.textContent.trim() : ''

        // 获取媒体内容
        const mediaContainer = post.querySelector('.post_media')
        const media = []

        if (mediaContainer) {
          // 获取图片
          const images = mediaContainer.querySelectorAll('img')
          images.forEach((img) => {
            if (img.src) {
              media.push({
                type: 'image',
                url: img.src
              })
            }
          })

          // 获取视频
          const videos = mediaContainer.querySelectorAll('video')
          videos.forEach((video) => {
            if (video.src) {
              media.push({
                type: 'video',
                url: video.src
              })
            }
          })
        }
        console.log(`get post ${postId} success`)

        const exist = posts.find((post) => post.id === postId)
        if (!exist) {
          posts.push({
            id: postId,
            timestamp,
            text,
            media
          })
          // 发送进度更新消息
          chrome.runtime.sendMessage({
            type: 'progress',
            scraped: posts.length,
            total: maxPosts
          })
        }
      } catch (error) {
        console.error('解析帖子时出错:', error)
      }
    }
  }
  return {
    posts,
    info
  }
}
