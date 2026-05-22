# 训练记录

每条训练都归到三大类之一：**跑步类（Run）**、**力量（Strength）**、**HIIT**。这份记录是所有统计的源头 —— 顶部统计条、图表、AI 教练能看到的数据、PR 栏，都从这里读。

## 六种活动类型

| 大类 | 具体类型 | 记录哪些字段 |
|---|---|---|
| 跑步 | Road Run（路跑）| 距离、时长、配速、心率、累计爬升、步频、GAP、有氧 TE |
| 跑步 | Trail Run（越野跑）| 距离、时长、配速、心率、累计爬升、有氧 TE |
| 跑步 | Hiking（徒步）| 距离、时长、配速、心率、累计爬升、有氧 TE |
| 跑步 | Floor Climbing（爬楼/楼梯机）| 时长、心率、累计爬升（无水平距离）|
| 力量 | Strength | 时长、心率、可选身体部位 |
| HIIT | HIIT | 时长、心率、有氧 TE |

子类规则因大类而异：

- **Road Run** 必须选一种配速子类（Easy / Aerobic / Tempo / Interval），可加 Race 标记。详细规则见 [Running 配速分类](running.md)。
- **其他跑步类型**（Trail / Hiking / Floor Climbing）可加 Race 标记，但不分配速 —— 地形决定配速，按心率分类会误导。
- **Strength** 可勾选 Upper Body / Lower Body / Core 任意组合。
- **HIIT** 没有子类。

> 「积极恢复」（按摩、瑜伽放松等）**不是**一种训练类型。它是**日级标签**，在日历上某一天上勾选。

## 添加训练（手动）

1. **Training** tab → 点 **Add Activity**。
2. 选日期和类型。Road Run 默认子类 Easy Run，其他类型默认空。
3. 按你测到的填。**日期和时长必填**，距离/心率/爬升/步频/GAP/TE 都可选 —— 没量到就留空。
4. Save。新行立刻出现在列表顶部，统计和图表同步更新。

## 编辑训练

在 Training 或日历上点任意一行进入内联编辑。点外面取消 —— 如果有未保存改动会弹确认框，避免误丢。

## 批量操作

- **Select mode**（Activities 右上角）：勾选多行批量删除。
- **Upload .csv**：打开 Garmin CSV 导入流程，详见 [数据导入](data-import.md)。

## 筛选和时间范围

- 顶部 **Global Filter** chips 同时作用于 Activities 列表和图表。可按跑步子类、力量身体部位、HIIT 筛选。
- **Period Selector**（Week / Month / Quarter / Year / Custom / All）控制统计条和列表的时间范围。**图表有自己独立的时间范围**，详见 [图表](charts.md)。

## 关于计划训练

从 AI 教练那里一键导入到日历的**计划训练**只在日历上以虚线框显示。它们**不**进 Training 列表，**不**进统计条，**不**进图表，**不**进 PR 栏。只有等你手动标记完成后才会计入。
