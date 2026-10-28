# 案子（job）怎麼寫

每個案子是 `js/jobs/jobN.js` 的一個預設匯出物件。範例看 `js/jobs/job1.js`（老公寓客廳），新案子照它的寫法。

## 物件欄位

```js
export default {
  id: 'j2', title: '浴室翻新', short: '浴室', sub: '一句話說明', color: '#7fb6d6', pay: 160000, doneLine: '結算畫面的大標',
  room: { w: 3.0, d: 2.4, h: 2.8, floor: 'wood'|'concrete'|'checker'|'carpet', window: true, winX: -0.6, door: false, wall: '#d6cab4' },
  setup(ctx) {},              // 房間彈起來之前，先擺好現況（舊東西、人物）
  stations: [ { id, name, asker, quizTitle, quizLine, topics: [...], n: 2, camera: { theta, phi }, steps: ctx => [ ...步驟 ] } ],
  events:   [ { after: '站的 id', who, name, title, line, topics: [...], n: 2, before: async ctx => {} } ],
  async finale(ctx) {},       // 完工：擺家具、收掉施工痕跡
};
```

- 每一站做完，主流程會自動叫 `asker` 出 `n` 題（預設 2 題）原題，題目從這一站的 `topics` 挑；答完可以選「加班再問 3 題」。
- `events` 在指定站之後出現，用來放共同科目（勞檢員、環保局、節能顧問、屋主…）。
- 每個 topic（`data/topics.json` 的鍵，例如 `06/玻璃`）只能分到一個案子的一個地方，全部 118 個都要分到。開機時 `main.js` 會在 console 警告漏掉的主題。

## ctx

| 欄位 | 用途 |
|---|---|
| `ctx.R` | 房間。`R.w/d/h`、`R.X0 X1 Z0 Z1`（內牆邊界）、`R.inside`（地板面 y=0 的群組）、`R.layer(名稱)`（取得或新增圖層群組）、`R.back`、`R.left`、`R.slab`、`R.slabMat` |
| `ctx.run.fine(品質扣分, 罰款, 說明)` | 記一次錯誤 |
| `ctx.focus({theta, phi})` | 轉相機（theta 左右、phi 俯仰；phi 越大越平視） |
| `ctx.frame()` | 回到預設視角 |
| `ctx.tapTargets` | 自己寫點擊玩法時，給自動測試用：`bad => [下一個該點的 Object3D]` |

座標：1 單位 = 1 公尺。`R.inside` 裡 y=0 是地板面，牆高 `R.h`。房間後牆在 `R.Z0`，左牆在 `R.X0`，前面和右邊是開的。

## 步驟（`js/game/steps.js`）

所有步驟的 `rules` 都是**題號陣列**；畫面會顯示引用那幾題的所有工法（`data/topics.json` 的筆記重點，每題最多 3 條）並收進工法手冊。要指定某一條，寫成 `'主題#第幾條'`（0 起算），例如 `'06/玻璃#3'`。只能用題庫裡存在的題號，而且動作的對錯必須和題庫答案一致。

| type | 欄位 | 玩法 |
|---|---|---|
| `say` | `who, text, btn, task` | 對話，按「繼續」 |
| `do` | `fn: async ctx => {}` | 自己寫的玩法或 3D 動畫 |
| `checklist` | `who, text, options: [[文字, 對錯]], rules, fine, okMsg, ngMsg, note` | 勾選所有正確的 |
| `choose` | `who, text, options: [{t, ok, msg, act, fine}], rules, cols, retry` | 單選；選錯可再選 |
| `order` | `who, text, items: [{id,label,icon}], order: [id], why: {id: 為什麼還不行}, decoy: {id: {msg, fine, act, rules}}, act: {id: async ctx => {}}, say: {id: 文字}, seq, done, rules` | 從抽屜拖進房間（或點一下），照順序 |
| `tap` | `who, text, targets: ctx => [{obj, ok, msg, label}], need, time, rules, camera, missFine` | 點場景裡的東西（找危險、量柱梁…） |
| `slider` | `who, text, min, max, step, value, unit, preview(ctx,v), check(v) => {ok,msg,act}, rules, good` | 調數值；`good` 給自動測試用的正解 |
| `calc` | `who, text, hint, answer, tol, unit, explain, rules` | 輸入計算結果 |
| `match` | `who, text, pairs: [[左, 右]], rules` | 配對（右邊文字不要重複） |
| `quiz` | `who, title, line, topics, n` | 額外的原題事件 |

`who` 用 `js/game/ui.js` 的 `CASTINFO` 鍵（boss、worker、inspector、reviewer、owner、plumber、eco、energy、steel、painter、mason、carpenter、glazier、accountant、fire、hr、designer、manager、clerk），要別的名字就另外給 `name`。

抽屜圖示 `icon`：`ui.js` 的 `ICON` 鍵（pipe、conduit、edge、ink、hanger、grid、level、board、stone、putty、primer、paint、roller、sand、brick、mortar、water、membrane、tile、trowel、grout、toilet、helmet、stud、wool、screw、glass、silicone、wood、saw、drill、sprinkler、smoke、extinguisher、exit、curtain、carpet、wallpaper、glue、desk、aircon、sign、rope、cut、plug、ladder、mask、goggles、gloves、earmuff、doc、stamp、money、bag、truck、lamp、shield），或一個函式 `(x, R) => {}` 自己畫（112×112 座標、原點在中心；`R(x, y, w, h, 顏色, 圓角)` 畫圓角方塊）。沒有圖示就用標籤第一個字。

## 道具（`js/engine/props.js`）

- `P.brickRows / debris / ladder / extinguisher / exitSign / smoke / sprinkler / outlet / panel / sofa / plant / rug / table / chair / desk / cabinet / toilet / basin / shower / drain / counter / espresso / curtain / studs / board / glass / aircon / scaffold / sign(text)`
- `tileGrid(w, d, size, 顏色)` + `revealTiles(list)`：一格一格出現
- `CAST.worker() / boss / inspector / reviewer / owner / plumber / eco / energy`、`person({body, pants, helmet, hat, hair, vest, cap, clip})`
- 動畫：`place(layer, mesh, x, y, z, ry)`、`popIn(obj)`、`dropIn(obj)`、`growX(obj)`、`popOut(obj)`
- 自己做道具：`new Kit()`，`.box(w, h, d, 顏色, [x, y, z], ry)`、`.flat(形狀, 厚度, 顏色, [x, y, z])`、`.cyl(r, h, 顏色, [x,y,z])`、`.pipe(r, a, b, 顏色)`、`.add(形狀, 厚度, 顏色, pos, rot)`，最後 `.mesh()`。形狀用 `SH.rect / rectC / round / circle / poly / blob`。
- 特效：`dust(位置, 數量, 顏色)`、`confetti(位置)`、`sparks(位置)`（`js/engine/fx.js`，位置是世界座標，用 `obj.getWorldPosition(new THREE.Vector3())`）
- 音效：`SFX.pop / thud / drill / splash / creak / chime / good / bad / whistle / crumple / flip / tick / coin`

## 測試

```bash
python3 -m http.server 8765       # 在專案根目錄
node tools/autoplay.mjs http://localhost:8765/ 1 good phone   # 第 2 案（0 起算），全對
node tools/autoplay.mjs http://localhost:8765/ 1 bad desktop  # 故意犯錯
```

測試某一站時，網址加 `?st=站的id`（再加 `&all=1` 開放全部案子）可以直接從那一站開始。

自動測試會讀 `window.__kgStep` 取得正解，所以 `checklist / choose / order / slider / calc / match / tap` 都要把正解放在欄位裡；自己寫的 `do` 玩法要設 `ctx.tapTargets`。
