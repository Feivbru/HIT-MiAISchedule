async function scheduleHtmlProvider() {
    await loadTool('AIScheduleTools')

    console.log(window.location.href)
    // 检查是否在正确的页面
    if (!window.location.href.includes('jwts.hit.edu.cn')) {
        await AIScheduleAlert('请在教务系统内进行导入操作')
        return 'do not continue'
    }

    try {
        // 直接请求课表页面
        const response = await fetch('http://jwts.hit.edu.cn/kbcx/queryGrkb', {
            credentials: 'include',  // 携带cookie信息
            headers: {
                'Accept': 'text/html',
            }
        })

        if (!response.ok) {
            throw new Error('课表请求失败')
        }

        const html = await response.text()
        
        // 使用临时div解析HTML
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        // 获取课表容器
        const scheduleContainer = doc.querySelector('.xfyq_area')
        if (!scheduleContainer) {
            throw new Error('未找到课表信息')
        }
        await AIScheduleAlert('获取课表信息成功')
        return scheduleContainer.outerHTML

    } catch (error) {
        console.error('获取课表失败:', error)
        await AIScheduleAlert('获取课表信息失败，请确保已登录教务系统并重试')
        return 'do not continue'
    }
}
