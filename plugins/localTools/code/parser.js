function scheduleHtmlParser(html) {
    // 使用cheerio加载HTML
    const $ = cheerio.load(html, { decodeEntities: false })

    const courseInfos = []

    // 获取所有行
    const rows = $('table.addlist_01 tr')
    // 遍历每个单元格，跳过表头(i从1开始)
    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i]
        
        // 获取时间段信息
        const timeCell = $(tr).find('td').eq(1).text().trim()
        if (!timeCell) return

        // 解析节次
        const sectionMatch = timeCell.match(/第(\d+),*(\d*)节/)
        if (!sectionMatch) return
        const startSection = parseInt(sectionMatch[1])
        const endSection = sectionMatch[2] ? parseInt(sectionMatch[2]) : startSection

        // 遍历星期几
        for (let day = 1; day <= 7; day++) {
            const cell = $(tr).find('td').eq(day + 1)
            const cellHtml = cell.html()
            const courseTexts = cellHtml ? cellHtml.split('<br>') : []

            if (!courseTexts) continue

            var currentCourse = null

            for (var j = 0; j < courseTexts.length; j++) {
                var text = courseTexts[j]
                var trimmedText = text.trim()
                if (!trimmedText || trimmedText === '&nbsp;') continue

                // 课程名处理
                if (!trimmedText.includes('[') && !trimmedText.includes('周')) {
                    // 如果当前课程存在且没有教室信息，则这是教室信息而不是新课程
                    if (currentCourse && !currentCourse.position) {
                        // 如果是体育课，不自动设置教室信息
                        if (!currentCourse.name.includes('体育')) {
                            currentCourse.position = trimmedText
                        }
                        continue
                    }
                    
                    // 否则这是一个新课程
                    if (currentCourse) {
                        courseInfos.push(currentCourse)
                    }
                    currentCourse = {
                        name: trimmedText,
                        day: day,
                        sections: [],
                        weeks: []
                    }
                    // 如果是体育课，设置默认教室为"待定"
                    if (trimmedText.includes('体育')) {
                        currentCourse.position = '待定'
                    }
                    for (var section = startSection; section <= endSection; section++) {
                        currentCourse.sections.push({ section })
                    }
                    continue
                }


                // 处理教师、周数和教室信息
                if (currentCourse && trimmedText.includes('[')) {
                    // 处理教师和周数信息
                    if (trimmedText.includes('周，')) {
                        // 处理多教师情况
                        var teachers = trimmedText.split('周，')
                        var lastTeacherInfo = teachers[teachers.length - 1]
                        var teacherWeeks = []
                        var allTeachers = []

                        // 处理每个教师的信息
                        for (var k = 0; k < teachers.length; k++) {
                            var teacherInfo = teachers[k]
                            var teacherMatch = teacherInfo.match(/(.+?)\[/)
                            var weekMatch = teacherInfo.match(/\[(.*?)\]/)
                            if (teacherMatch && weekMatch) {
                                var teacher = teacherMatch[1]
                                var weeks = parseWeeks(weekMatch[1])
                                // 替换展开运算符
                                for (var m = 0; m < weeks.length; m++) {
                                    teacherWeeks.push(weeks[m])
                                }
                                allTeachers.push(teacher)
                            }
                        }

                        // 设置教师和周数
                        currentCourse.teacher = allTeachers.join('，')
                        currentCourse.weeks = uniqueArray(teacherWeeks)

                        // 提取教室信息
                        var positionParts = lastTeacherInfo.split(/\]周(?!.*\[)/)
                        var position = positionParts.length > 1 ? positionParts[positionParts.length - 1] : null
                        if (position) {
                            position = position.trim()
                            if (position && !position.includes('[')) {
                                currentCourse.position = position
                            }
                        }
                    } else {
                        // 处理单教师多周情况
                        var teacherMatch = trimmedText.match(/(.+?)\[/)
                        if (teacherMatch) {
                            var teacher = teacherMatch[1]
                            if (!currentCourse.teacher) {
                                currentCourse.teacher = teacher
                            } else if (currentCourse.teacher !== teacher) {
                                courseInfos.push(currentCourse)
                                currentCourse = {
                                    name: currentCourse.name,
                                    day: currentCourse.day,
                                    sections: currentCourse.sections,
                                    position: currentCourse.position,
                                    teacher: teacher,
                                    weeks: []
                                }
                            }
                        }

                        // 提取所有周数
                        var weekMatches = trimmedText.match(/\[(.+?)\]周/g)
                        if (weekMatches) {
                            for (var n = 0; n < weekMatches.length; n++) {
                                var match = weekMatches[n]
                                var weekText = match.match(/\[(.*?)\]/)[1]
                                var weeks = parseWeeks(weekText)
                                // 替换展开运算符
                                for (var p = 0; p < weeks.length; p++) {
                                    currentCourse.weeks.push(weeks[p])
                                }
                            }
                        }

                        // 提取教室
                        var positionParts = trimmedText.split(/\]周(?!.*\[)/)
                        var position = positionParts.length > 1 ? positionParts[positionParts.length - 1] : null
                        if (position) {
                            position = position.trim()
                            if (position && !position.includes('[')) {
                                currentCourse.position = position
                            }
                        }
                    }
                } else if (!trimmedText.includes('[') && !trimmedText.includes('周') && currentCourse && !currentCourse.position) {
                    currentCourse.position = trimmedText
                }
            }
            
            // 保存最后一个课程
            if (currentCourse) {
                // 去重周数
                currentCourse.weeks = uniqueArray(currentCourse.weeks)
                courseInfos.push(currentCourse)
            }
        }
    }
    return courseInfos
}

// 解析周数的辅助函数
function parseWeeks(weekText) {
    var weeks = []
    if (weekText.includes('-')) {
        var parts = weekText.split('-')
        var start = Number(parts[0])
        var end = Number(parts[1])
        for (var week = start; week <= end; week++) {
            weeks.push(week)
        }
    } else if (weekText.includes('，')) {
        var numbers = weekText.split('，')
        for (var i = 0; i < numbers.length; i++) {
            weeks.push(Number(numbers[i]))
        }
    } else {
        weeks.push(Number(weekText))
    }
    return weeks
}

// 去重函数
function uniqueArray(arr) {
    var result = []
    for (var i = 0; i < arr.length; i++) {
        if (result.indexOf(arr[i]) === -1) {
            result.push(arr[i])
        }
    }
    return result
}