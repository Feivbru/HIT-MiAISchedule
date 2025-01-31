# MiAI 课表导入

## 代码介绍

这是整个开发中最关键的部分了，请仔细看看

写在前边：所有代码的最后一行不要加分号，浏览器插件测试的时候会把你的代码挂在window上，我们这边加了分号

老爹：还有一件事！你自己抽离出的函数务必放在我们提供的函数块内，否则真机测试不好使了不要怪我没说🙏

### 导入流程

代码分为三个部分Provider、Parser、Timer

首先在教务系统环境中执行Provider，该代码的主要目的是将包含课表信息的HTML提取出来，并返回String格式的信息

随后该String会上传到服务器环境执行Parser代码，该代码的主要目的是从HTML中格式化提取出课程信息

最终在教务系统环境中执行Timer代码，该代码将返回课程时间、学期总周数等信息

关于明明可以在Provider中完成Parser的操作还非得分出来一份代码在服务器执行是为了保护你的代码不被抓包，如果你想开源的话可以将代码上传至Github，然后将链接发送给我，我将把它放进资源Tab中

### Provider

获取必要的HTML，返回值是String

这里先提供一份示例代码

```javascript
function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) {//函数名不要动
  // 以下可编辑
  const ifrs = dom.getElementsByTagName("iframe");
  const frs = dom.getElementsByTagName("frame");
  if (ifrs.length) {
    for (let i = 0; i < ifrs.length; i++) {
      const dom = ifrs[i].contentDocument.body.parentElement;
      iframeContent += scheduleHtmlProvider(iframeContent, frameContent, dom);
    }
  }
  if (frs.length) {
    for (let i = 0; i < frs.length; i++) {
      const dom = frs[i].contentDocument.body.parentElement;
      frameContent += scheduleHtmlProvider(iframeContent, frameContent, dom);
    }
  }
  if (!ifrs.length && !frs.length) {
    return dom.querySelector('body').outerHTML
  }
  if (dom === document) {
    return document.getElementsByTagName('html')[0].innerHTML + iframeContent + frameContent
  }
  return iframeContent + frameContent;
}
```

接下来开始搞点花活了，在新版的代码中我们支持了异步操作

我们发现一些设备对于alert和prompt的支持并不是很好，甚至会导致代码运行失败，所以我们在这些设备上停用了它们

作为替代，我们提供了一个“课表风格”的AIScheduleAlert和AISchedulePrompt

下边是代码示例

```javascript
// 别忘了加async
async function scheduleHtmlProvider() {
  // 此步为必须，用于加载这个工具，后续会增加更多方法
  await loadTool('AIScheduleTools')
  // 使用它们的时候务必带上await，否则没有系统alert的时停效果
  await AIScheduleAlert('这是一条提示信息')
  // Prompt的参数比较多，所以传了个对象，最后会返回用户输入的值
  const userInput = await AISchedulePrompt({
    titleText: '提示', // 标题内容，字体比较大，超过10个字不给显示的喔，也可以不传就不显示
    tipText: '这是一条提示信息', // 提示信息，字体稍小，支持使用``达到换行效果，具体使用效果建议真机测试，也可以不传就不显示
    defaultText: '默认内容', // 文字输入框的默认内容，不传会显示版本号，所以空内容要传个''
    validator: value => { // 校验函数，如果结果不符预期就返回字符串，会显示在屏幕上，符合就返回false
      console.log(value)
      if (value === '1') return '这里的结果不可以是1'
      return false
  }})
}
```

既然支持了异步，那我们可以尽情的使用Fetch了！

如果你没用过Fetch，请看MDN的文档

示例代码

```javascript
async function scheduleHtmlProvider() {
  await loadTool('AIScheduleTools')
  // 使用Fetch请求教务的接口
  try {
    const res = await fetch('baidu.com')
    // 假设这个res是个JSON
    return JSON.stringify(res)
  } catch (error) {
    console.error(error)
    await AIScheduleAlert(error.message)
    return 'do not continue'
  }
}
```

不论是调用接口还是爬Html，你怎么方便怎么来，但是无论如何，请返回String ———— 嘤博

你应该也注意到了，刚刚的示例代码中在错误时返回了do not continue，我们规定，如果在Provider代码中返回这个字符串，则停止下一步的操作，等待用户再次点按开始导入

这个机制设计的目的是为了解决用户可能没在你所期望的页面点击开始导入，导致你没办法拿到必要的课程信息完成导入，以前的话就直接报错了，现在你可以弹个AIScheduleAlert提醒一下，然后重新导入

### Parser

本代码的运行环境在服务器，所以没有正常的window等变量

本函数不支持异步

下边是个代码示例

```javascript
function scheduleHtmlParser(html) {
  //除函数名外都可编辑
  //传入的参数为上一步函数获取到的html
  //可使用正则匹配
  //可使用解析dom匹配，工具内置了$，跟jquery使用方法一样，直接用就可以了，参考：https://cnodejs.org/topic/5203a71844e76d216a727d2e
  let result = []
  let bbb = $('#table1 .timetable_con')
  for (let u = 0; u < bbb.length; u++) {
    let re = { sections: [], weeks: [] }
    let aaa = $(bbb[u]).find('span')
    let week = $(bbb[u]).parent('td')[0].attribs.id
    if (week) {
      re.day = week.split('-')[0]
    }
    for (let i = 0; i < aaa.length; i++) {
      if (aaa[i].attribs.title == '上课地点') {
        for (let j = 0; j < $(aaa[i]).next()[0].children.length; j++) {
          re.position = $(aaa[i]).next()[0].children[j].data
        }
      }
      if (aaa[i].attribs.title == '节/周') {
        for (let j = 0; j < $(aaa[i]).next()[0].children.length; j++) {
          let lesson = $(aaa[i]).next()[0].children[j].data
          for (let a = Number(lesson.split(')')[0].split('(')[1].split('-')[0]); a < Number(lesson.split(')')[0].split('(')[1].split('-')[1].split('节')[0]) + 1; a++) {
            re.sections.push({ section: a })
          }
          for (let a = Number(lesson.split(')')[1].split('-')[0]); a < Number(lesson.split(')')[1].split('-')[1].split('周')[0]) + 1; a++) {
            re.weeks.push(a)
          }
        }
      }
      if (aaa[i].attribs.title == '教师') {
        for (let j = 0; j < $(aaa[i]).next()[0].children.length; j++) {
          re.teacher = $(aaa[i]).next()[0].children[j].data
        }
      }
      if (aaa[i].attribs.class == 'title') {
        for (let j = 0; j < $(aaa[i]).children()[0].children.length; j++) {
          re.name = $(aaa[i]).children()[0].children[j].data
        }
      }
    }
    result.push(re)
  }
  console.log(result)
  return result
}
```

对于返回的数据格式，我们有严格的规范，详见如下

```javascript
[
  {
    name: "数学", // 课程名称
    position: "教学楼1", // 上课地点
    teacher: "张三", // 教师名称
    weeks: [1, 2, 3, 4], // 周数
    day: 3, // 星期
    sections: [1, 2, 3], // 节次
  },{
    name: "数学",
    position: "教学楼1",
    teacher: "张三",
    weeks: [1, 2, 3, 4],
    day: 1,
    sections: [1, 2, 3],
  },
]
```

课程名称：String 长度50字节（一汉字两字节）

上课地点：String 长度50字节（一汉字两字节）

教师名称：String 长度50字节（一汉字两字节）

周数：Number[] [1，30] 之间的整数 超出会被裁掉

星期：Number [1，7] 之间的整数

节次：Number [1，30] 之间的整数 (默认[1，12]) 根据后续时间设置自动裁剪

请注意，如果出现不明原因导入失败，检查下是不是课程有冲突了

### Timer

本代码的运行环境和Provider是一致的

代码示例

```javascript
/**
 * 时间配置函数，此为入口函数，不要改动函数名
 */
async function scheduleTimer({
  providerRes,
  parserRes
} = {}) {
  // 支持异步操作 推荐await写法

  // 这是一个示例函数，用于演示，正常用不到可以删掉
  const someAsyncFunc = () => new Promise(resolve => {
    setTimeout(() => resolve(), 1)
  })
  await someAsyncFunc()

  // 这个函数中也支持使用 AIScheduleTools 譬如给出多条时间配置让用户选择之类的

  // 返回时间配置JSON，所有项都为可选项，如果不进行时间配置，请返回空对象
  return {
    totalWeek: 20, // 总周数：[1, 30]之间的整数
    startSemester: '', // 开学时间：时间戳，13位长度字符串，推荐用代码生成
    startWithSunday: false, // 是否是周日为起始日，该选项为true时，会开启显示周末选项
    showWeekend: false, // 是否显示周末
    forenoon: 1, // 上午课程节数：[1, 10]之间的整数
    afternoon: 0, // 下午课程节数：[0, 10]之间的整数
    night: 0, // 晚间课程节数：[0, 10]之间的整数
    sections: [{
      section: 1, // 节次：[1, 30]之间的整数
      startTime: '08:00', // 开始时间：参照这个标准格式5位长度字符串
      endTime: '08:50', // 结束时间：同上
    }], // 课程时间表，注意：总长度要和上边配置的节数加和对齐
  }
  // PS: 夏令时什么的还是让用户在夏令时的时候重新导入一遍吧，在这个函数里边适配吧！奥里给！————不愿意透露姓名的嘤某人
}
```

注意：

这个函数返回时间配置JSON，所有项都为可选项，如果不进行时间配置，请返回空对象
入口函数务必不要使用箭头函数
这个函数返回的配置为最高优先度，会覆盖掉所有的默认配置
这个函数运行环境和provder是一样的，所以也可以进行dom的操作（譬如从教务系统读个总周数之类的
想设置当前周数请自行计算开学时间以达到效果
有一个参数解构后可以得到parserRes和providerRes，如果需要在Parser里边传其他的东西给Timer，请看以下代码示例：

```javascript
function scheduleHtmlParser(html) {
  return {
    courseInfos: [], // 原先的返回内容
    something: '...', // 你自己定义的属性
  }
}
```

## 工具集

### AIScheduleTools

为解决某些平台使用Alert会导致崩溃的问题开发的一份交互控件, 仅可以在provider以及timer代码中使用

代码示例：

```javascript
// 外层的函数别忘记加async设置为异步，具体异步等问题详见百度
// 所有的调用都要加await以达到阻塞的效果
// 这一步为必须，引入代码块
await loadTool('AIScheduleTools')
// 模拟Alert
await AIScheduleAlert('这是一条提示信息')
// 更加定制化的Alert(同时也是为了避免某些网站出现乱码)
await AIScheduleAlert({
  titleText: '提示', // 标题内容，字体比较大，不传默认为提示
  contentText: '这是一条提示信息', // 提示信息，字体稍小，支持使用``达到换行效果，具体使用效果建议真机测试
  confirmText: '确认', // 确认按钮文字，可不传默认为确认
})

// 模拟Prompt，参数是个对象，具体内容看注释，返回值是String
const userInput = await AISchedulePrompt({
  titleText: '提示', // 标题内容，字体比较大，超过10个字不给显示的喔，也可以不传就不显示
  tipText: '这是一条提示信息', // 提示信息，字体稍小，支持使用``达到换行效果，具体使用效果建议真机测试，也可以不传就不显示
  defaultText: '默认内容', // 文字输入框的默认内容，不传会显示版本号，所以空内容要传个''
  validator: value => { // 校验函数，如果结果不符预期就返回字符串，会显示在屏幕上，符合就返回false
    console.log(value)
    if (value === '1') return '这里的结果不可以是1'
    return false
}})

// 确认模块，用于让用户选择是或者否，返回值为Boolean
const userConfrim = await AIScheduleConfirm({
  titleText: '提示', // 标题内容，字体比较大，超过10个字不给显示的喔，也可以不传就不显示
  contentText: '需要确认的内容', // 提示信息，字体稍小，支持使用``达到换行效果，具体使用效果建议真机测试，为必传，不传显示版本号
  cancelText: '取消', // 取消按钮文字，可不传默认为取消
  confirmText: '确认', // 确认按钮文字，可不传默认为确认
})
// 精简版确认模块，参数直接为ContentText
const userConfirm = await AIScheduleConfirm('需要确认的内容')

// 选择模块，用户让用户多选一，暂不支持多选，返回值为选项列表中某一项
const userSelect = await AIScheduleSelect({
  titleText: '提示', // 标题内容，字体比较大，超过10个字不给显示的喔，也可以不传就不显示
  contentText: '这是一条提示信息', // 提示信息，字体稍小，支持使用``达到换行效果，具体使用效果建议真机测试，为必传，不传显示版本号
  selectList: [
    '选项一',
    '选项二',
    '选项三',
  ], // 选项列表，数组，为必传
})
```

### KingoImgReader

解决了旧版青果教务系统的图片识别问题

由于降噪逻辑十分繁杂且耗时，不要上传非青果图片，影响真正青果用户使用

以洛阳理工的青果教务为例，provider和parser代码如下

provider代码

```javascript
async function scheduleHtmlProvider() {
  await loadTool('AIScheduleTools')
  await loadTool('KingoImgReader')
  const image = document.getElementsByName("frmbody")[0]?.contentWindow?.document?.getElementsByName("frmMain")[0]?.contentWindow?.document?.getElementsByName("frmRpt")[0]?.contentWindow?.document?.getElementsByTagName('img')[0]
  if (!image) {
    await AiScheduleAlert('未检查到图片请重试')
    return 'do not continue'
  }
  const providerRes = await KingoImgReader(image)
  return providerRes
}
```

parser代码

```javascript
function scheduleHtmlParser(providerRes) {
  return JSON.parse(providerRes)
}
```

