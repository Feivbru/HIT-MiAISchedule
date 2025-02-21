/**
 * 时间配置函数，此为入口函数，不要改动函数名
 */
async function scheduleTimer({
    providerRes,
    parserRes
} = {}) {
    // console.log(providerRes, parserRes)
    // 从HTML中提取的作息时间:
    // 第1-2节：8:00~9:45
    // 第3-4节：10:00~11:45
    // 第5-6节：13:45~15:30
    // 第7-8节：15:45~17:30
    // 第9-10节：18:30~20:15
    // 第11节：20:30~21:20
    // 第12节：21:25~22:15

    // 获取当前日期
    const now = new Date()
    
    // 获取本周一的日期
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1) // 周日getDay()为0，周一为1
    
    // 设置为当天0点
    monday.setHours(0, 0, 0, 0)
    
    // 转换为13位时间戳字符串
    const startSemester = monday.getTime().toString()

    await AIScheduleAlert('时间处理完成')

    return {
        totalWeek: 16, // 一般为16周
        startSemester, // 开学时间戳
        startWithSunday: false, // 是否周日为起始日
        showWeekend: true, // 显示周末
        forenoon: 4, // 上午课程节数
        afternoon: 4, // 下午课程节数
        night: 4, // 晚间课程节数
        sections: [
            { section: 1, startTime: '08:00', endTime: '08:50' },
            { section: 2, startTime: '08:55', endTime: '09:45' },
            { section: 3, startTime: '10:00', endTime: '10:50' },
            { section: 4, startTime: '10:55', endTime: '11:45' },
            { section: 5, startTime: '13:45', endTime: '14:35' },
            { section: 6, startTime: '14:40', endTime: '15:30' },
            { section: 7, startTime: '15:45', endTime: '16:35' },
            { section: 8, startTime: '16:40', endTime: '17:30' },
            { section: 9, startTime: '18:30', endTime: '19:20' },
            { section: 10, startTime: '19:25', endTime: '20:15' },
            { section: 11, startTime: '20:30', endTime: '21:20' },
            { section: 12, startTime: '21:25', endTime: '22:15' }
        ]
    }
}