![PicoTag 網頁介面示意](docs/img/demo.jpg)

[![cht](https://img.shields.io/badge/lang-cht-green.svg)](README.cht.md)
[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)

# PicoTag
**網球與羽毛球拍穿線紀錄 QR Code 系統**

> 用 QR Code 把「每一次穿線紀錄」貼在球拍上：掃一下就能查看日期、張力、線材、球拍資訊與備註。  
> 不綁定任何特定硬體，穿線師 / 店家 / 自己穿線的人都能使用。

PicoTag 30 秒快速示範：建立 Tag、產生 QR 標籤，並掃描查看穿線紀錄。

[![PicoTag 快速示範（YouTube Shorts）](https://img.youtube.com/vi/-zU-sv66qa0/0.jpg)](https://youtu.be/-zU-sv66qa0)

## 快速了解：它能做什麼？

- **建立 Tag → 產生 QR Code → 列印貼紙 → 貼到球拍**  
  每次穿線都能建立一筆紀錄，並產生專屬 QR Code 標籤。

- **球拍主掃描即可查看紀錄並分享連結**  
  掃 QR Code 會開啟該筆穿線資訊頁面，方便回顧與轉傳給朋友/穿線師。

- **支援羽球/網球不同標籤版型**  
  提供 **羽球方形標籤** / **網球細長標籤**，更符合不同貼附位置。

- **Remark（備註）功能：把手感與狀況記下來**  
  使用者可以在備註持續補充「打起來的感覺、斷線位置、下次想調的張力/線材」等，除了方便自己追蹤與比較，也能把實際使用回饋提供給穿線師，協助下次調整更貼近需求。

- **後台管理功能（Admin）**  
  管理參考清單（球拍/線材/Pattern/穿線師等）、查看所有 Tag 紀錄、系統狀態與網站個人化設定。

- **匯出功能（CSV）**  
  可依日期區間匯出紀錄，後續可用 Excel/Google Sheets 做統計與分析（例如線材使用比例、張力分布、客戶回流等）。

**範例紀錄頁面**：https://picotag.cc/?id=EHshhlCh

---

## 公開網頁介面

PicoTag 可直接透過公開網頁介面使用：

**https://picotag.cc**

- 提供完整的 **QR Code 產生** 與 **紀錄查詢** 功能  

> [!TIP]
> 如果你想直接使用、不想自行架設網站，可直接使用公版網站建立與查詢 Tag。  
> 公版網站不提供後台管理功能（records/reference/site/system），後台僅於「自行架設」時提供。

---

## QR Code 列印方式（常見）

- **18mm 標籤機**：快速列印並貼在球拍上  
  ![18mm 標籤機 QR Code 範例](docs/img/label_maker.jpg)

- **一般印表機**：列印後裁剪黏貼  
  ![一般印表機 QR Code 範例](docs/img/printer.jpg)

---

## 文件

主要說明與教學已整理在 `docs/`：

- **使用說明（User Guide）**：[`docs/1.user-guide.cht.md`](docs/1.user-guide.cht.md)  
  適合一般使用者與穿線師：如何建立 Tag、貼到球拍、球友掃碼查詢，以及常用功能（含後台功能簡介）。

- **建置教學（Deploy Guide）**：[`docs/2.deploy-cloudflare.cht.md`](docs/2.deploy-cloudflare.cht.md)  
  適合想自行架設網站的人：Cloudflare Pages + KV + D1 + Turnstile 的完整建置流程。

- **後續自行開發（Dev Guide）**：[`docs/3.dev-guide.cht.md`](docs/3.dev-guide.cht.md)  
  適合想自己改程式碼的人：下載 Release ZIP → 修改檔案 → 重新部署上線（Wrangler）。

---

## 資料處理、使用規範與責任說明

與 **公開網頁介面** 相關的資料處理方式、使用規範、責任範圍與免責說明，請參考：

**[NOTICE.md](./NOTICE.md)**

---

## 安全性與聯絡方式

若發現任何安全性問題、漏洞，或需要處理 **官方公開網頁介面** 相關的資料刪除請求，請聯絡：

**contact@picotag.cc**

請勿於公開管道張貼任何個人或敏感資訊。  
聯絡時請僅提供必要資訊（例如 Tag ID），以利處理。

---

## 授權與署名說明

PicoTag 採用 **MIT License** 授權。

在使用原始或衍生的網頁介面時，請保留：
- 專案名稱 **「PicoTag」**
- 頁尾署名資訊

相關說明請參考：
- [LICENSE](./LICENSE)
- [Attribution & Name Policy](./ATTRIBUTION.md)

---

## 致謝

- **qrcodejs（davidshimjs）**：用於前端 QR Code 產生功能  
- **JetBrains Mono**：用於等寬字體顯示（例如 Tag ID / 系統資訊）  
