//postリクエストを受取ったときに発火する関数
function doPost(e) {
  // 応答用Tokenを取得。
  const replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  // メッセージを取得
  const userMessage = JSON.parse(e.postData.contents).events[0].message.text;
  try {

    //メッセージを改行ごとに分割
    const allMsg = userMessage.split("\n");
    // データを書き込むスプレッドシートを定義
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");
    // 最終行の取得
    const lastRow = sheet.getLastRow();
    // 最終列の取得
    const lastColumn = sheet.getLastColumn();

    // 返答メッセージ
    let message = "";
    switch (allMsg[0]) {
      case "今のタスクは？":
        message = returnData(sheet, lastRow, lastColumn);
        break;
      case "完了":
        message = deleteRow(sheet, lastRow, allMsg);
        break;
      default:
        message = dataAdd(sheet, lastRow, lastColumn, allMsg);
        break;
    }

    // lineで返答する
    lineReply(message, replyToken);

  } catch (e) {
    console.log(e);
    let message = "エラーが発生しました。" + e;
    lineReply(message, replyToken);
  }

}
