# 数据导入（Garmin CSV）

可以从 **Garmin Connect 导出的 CSV 文件**批量导入活动，省去一条条手动录入的麻烦。

## 从 Garmin Connect 导出

1. 进 Garmin Connect → **Activities** → 列表视图。
2. 按需要筛选日期或类型（导入器不挑，每行都会让你预览）。
3. 点列表右上角的 **Export CSV** 按钮。
4. 保存到本地。

> 手机也能用这个流程：手机浏览器登录 Garmin Connect 网页版导出 CSV，存到手机，再回到 Training Studio 上传。

## 导入流程

1. 打开 Training，进入 Activities 子视图。
2. 点 **Upload .csv**（手机端是 **Upload**），选刚才保存的文件。
3. 可能依次出现两个审核弹窗：
   - **未知活动类型** —— 如果某些行的活动类型识别不了（比如「Open Water Swim」「Padel」），会让你逐条手动选一个对应类型。
   - **重复警告** —— 如果某行的日期/类型/时长跟已有记录完全一致，会让你选 **Skip duplicates（跳过重复）** 或 **Add anyway（强制加入）**。
4. 接着是 **Review** 面板，列出每行的解析结果和勾选框：
   - 不想导入的行取消勾选。
   - Road Run 行可以通过下拉框覆盖自动分配的配速子类。
5. 点 **Import** 写入数据库。

## 读了哪些字段

会从 Garmin CSV 里找以下列：

| Garmin 列名 | 用途 |
|---|---|
| Activity Type | 决定活动类型 |
| Date | 日期 |
| Distance | 距离（km）|
| Time / Total Time / Moving Time / Elapsed Time | 时长（按顺序找第一个存在的列）|
| Avg HR | 平均心率 |
| Max HR | 最大心率 |
| Total Ascent | 累计爬升 |
| Avg Run Cadence | 平均步频 |
| Aerobic TE | 有氧训练效果 |
| Avg GAP | 坡度调整配速 |

配速自动算出来：`时长 ÷ 距离`（两个都 > 0 时）。

## 活动类型怎么映射

读 Garmin 的 "Activity Type" 列，按关键字判断：

| Garmin 类型包含 | 映射到 |
|---|---|
| trail | Trail Run |
| hiking、walking、walk | Hiking |
| stair、stepper、step machine、floor | Floor Climbing |
| hiit、interval training、crossfit | HIIT |
| strength、weight | Strength |
| yoga、pilates、stretch | Strength |
| run（且不含上述）| Road Run |
| 其他 | 标记为未知（让你选）|

## 重复检测规则

满足下面**全部**条件视为重复：

- 日期相同
- 类型相同
- 时长（秒）相同

**Skip duplicates** 只跳过重复行；**Add anyway** 全部加入（会出现两条相同记录 —— 只在 Garmin 把一次训练拆成两次导出时才有用）。

## 提示

- CSV 完全在浏览器本地解析。不会传到任何其他地方，只有你确认后的勾选行才入库。
- Garmin 的导出列名会随 app 版本和语言变化。如果导入器提示「找不到时长列」，多半是 Garmin 改了列名 —— 反馈给开发者修。
- 新出现的活动类型（划船、骑行等）目前会被识别成「未知」需要手动选 —— 这是有意的保守策略，避免错误归类。
