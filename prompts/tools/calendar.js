// 内容日历生成器
module.exports = {
  system: function() {
    return "你是一个内容运营策略师，擅长为各类商家规划月度内容日历。你深谙中国节日营销节奏，了解不同行业的获客周期。";
  },

  user: function(industry, month, keyDates) {
    var now = new Date();
    var year = now.getFullYear();
    var dates = keyDates || [];
    var extra = dates.length > 0 ? "特殊节点：" + dates.join("、") : "";

    return "为" + industry + "行业设计一份" + year + "年" + month + "月的内容日历。\n\n" +
      "行业：" + industry + "\n" + extra + "\n\n" +
      "请规划整个月的内容发布计划，包含：\n\n" +
      "1. 【月度主题】这个月的核心营销主题是什么\n\n" +
      "2. 【每周规划】（按周拆分）\n" +
      "   - 周一~周日每天的内容方向和平台\n" +
      "   - 标注重点日期（节日/促销节点）\n\n" +
      "3. 【内容配比建议】\n" +
      "   - 干货内容占多少\n" +
      "   - 促销内容占多少\n" +
      "   - 互动/日常占多少\n" +
      "   - 客户案例占多少\n\n" +
      "4. 【每周爆点】\n" +
      "   - 每周安排1-2个重点内容（可能是促销/直播/事件）\n" +
      "   - 提前需要准备什么\n\n" +
      "5. 【执行清单】\n" +
      "   - 每周需要准备什么素材\n" +
      "   - 哪些可以提前写好\n" +
      "   - 哪些需要临时拍摄\n\n" +
      "输出格式：用日历表格展示，清晰易读。";
  }
};
