# 開工！室內裝修乙級立體書

一本會蓋房子的 3D 立體書，給要考「建築物室內裝修工程管理乙級（12600）」學科的人玩。
翻開書，接四個翻修案子；每一個工地動作都是一個考點，做錯會看到後果。勞檢員、審查人員、屋主、師傅會用題庫原題考你。
12600 學科題庫 718 題和四科共同科目（扣掉刪題後）395 題，共 1,113 題，全部分到四個案子的各個工地階段裡。

| 案子 | 工地階段 | 共同科目事件 |
|---|---|---|
| 1 老公寓客廳 | 報價、看圖、放樣、拆牆、輕鋼架天花板、油漆、竣工 | 勞檢員突擊、環保局稽查、屋主 |
| 2 浴室翻新 | 看圖、砌磚、水電、粉刷防水、貼磚、工程日報 | 節能顧問、環保局、勞檢員 |
| 3 巷口咖啡店 | 看圖、送審、防火、消防設備、軟裝 | 審查與公務往來、節能顧問、環保局 |
| 4 新創辦公室 | 看圖、排進度、輕隔間、木作、玻璃與金屬、高處與吊掛 | 執行長、人資、勞檢員、節能顧問 |

其他功能：

- **題庫圖鑑**：看每個工作項目、每個主題見過幾題、熟練幾題；任何主題都能直接「特訓」。
- **工法手冊**：做對動作、答完題目，會收進那一條工法（知識庫筆記裡的重點，附題號）。
- **考前衝刺**：依學科配分（12600 七個工作項目依題數比例共 80%，共同科目各 5%）抽 20 題。
- **間隔複習**：答錯的題目下一案就會再出現，答對的間隔越拉越長。完成第一個案子後才顯示預估分數。
- **進度碼**：進度存在瀏覽器裡；換裝置時在「設定」複製進度碼、到新裝置貼上。

## 怎麼開

這是純前端的多檔網站，沒有建置步驟，但要用 http 伺服器開（直接雙擊 `index.html` 會讀不到題庫 JSON）：

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000/
```

放上 GitHub Pages：把整個資料夾推到 repo，在 Settings → Pages 選分支即可。

網址參數：`?q=low` 固定最低畫質（舊手機）、`?q=high` 固定最高畫質、`?all=1` 一開始就開放全部案子（測試用）。

## 檔案

```
index.html            頁面骨架
css/style.css         介面樣式（紙卡、按鈕、抽屜）
js/main.js            主流程：開書、目錄、案子、結算、圖鑑、手冊、衝刺、設定
js/engine/            3D 引擎（底子是〈十五局 07 紙上小島〉）
  core.js             renderer、相機、畫質自動降級、主迴圈
  paper.js            紙紋、卡紙材質、Kit（合併卡紙網格）
  book.js             立體書、翻頁
  props.js            房間、紙片人、道具
  fx.js / audio.js / input.js   粒子、合成音效、觸控與拖曳
js/game/              遊戲邏輯
  data.js save.js     題庫與工法、存檔與間隔複習
  steps.js            工地動作的通用玩法（排順序、勾選、點場景、滑桿、計算、配對）
  quiz.js ui.js       原題卡、介面元件
js/jobs/job1–4.js     四個案子的內容
data/questions.json   1,113 題（題幹、選項、答案、所屬主題、對應工法、可能過時的註記）
data/topics.json      118 個主題與 1,027 條工法
img/q/                51 張看圖題附圖（已把答案塗白）
vendor/               three.js r174、GSAP 3.12.5（放在本地，不靠 CDN）
docs/JOB_API.md       怎麼寫或修改一個案子
tools/autoplay.mjs    自動測試：把案子從頭玩到結算
tools/data/           從題庫 PDF 和筆記重建 data/ 的腳本
```

## 題庫換版時

技能檢定中心改版題庫時（例如共同科目 90006、90007 在 116-01-01 起改用新版），照 `tools/data/build_data.py` 開頭的五個步驟重建 `data/`：

1. `parse_pdf.py` 把每份 PDF 轉成 JSON。
2. `crop_figures.py` 裁出看圖題的附圖到 `img/q/`。
3. `build_data.py stage1` 合併成題庫（自動排除「本題刪題」）。
4. `extract_notes.py` 從重點筆記抽出主題與工法；每條重點後面要有 `[題號]`。
5. `build_data.py stage2` 寫入 `data/`；有題目找不到工法會停下來列出題號。

然後：

- 改 `js/game/save.js` 的 `BANK_VERSION`，玩家存檔裡換版科目的熟練度會自動清掉（同一題號已經是不同題目）。
- 新版的主題名稱如果變了，打開遊戲看瀏覽器 console 有沒有「沒有分配到案子的主題」警告，把新主題加到某個案子的 `events` 或站的 `topics`。
- 工地動作裡引用的題號（各案子 `rules: [...]`）若是換版科目的題號，要對照新版改。
- 封面說明（`index.html` 的「共同科目用 115 年報檢適用的版本」）一起改。

## 測試

```bash
python3 -m http.server 8765 &
NR=$(npm root -g) node tools/autoplay.mjs http://localhost:8765/ 0 good phone     # 第 1 案，全對，手機尺寸
NR=$(npm root -g) node tools/autoplay.mjs http://localhost:8765/ 0,1,2,3 bad desktop
```

需要 Node.js 與 Playwright（`npm i -g playwright && npx playwright install chromium`）。輸出最後一行 `nErr` 要是 0。

## 來源與授權

- 題目與答案：勞動部勞動力發展署技能檢定中心公告的學科測試參考資料（12600 V114090112；90006 V114101518、90007 V114090117、90008 V115041316、90009 V114112111），照原文收錄。
- 工法說明：整理自作者的讀書筆記；有些題庫答案和現行法規不同，遊戲照題庫答案，並在題目下方標「可能過時或有疑義」。
- three.js：MIT License（`vendor/three-LICENSE.txt`）。GSAP：GreenSock 標準授權（免費使用）。字型 jf open 粉圓（Huninn）：SIL Open Font License，經 Google Fonts 載入。
