//postリクエストを受取ったときに発火する関数
function doPost(e) {
  // 応答用Tokenを取得。
  const replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  // メッセージを取得
  const userMessage = JSON.parse(e.postData.contents).events[0].message.text;
  try {

    //メッセージを改行ごとに分割
    const allMsg = userMessage.split("\n");
    // スプレッドシートの取得
    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
    // データを書き込むスプレッドシートを定義
    const taskSheet = spreadSheet.getSheetByName("タスク");
    // 最終行の取得
    const lastRow = taskSheet.getLastRow();
    // 最終列の取得
    const lastColumn = taskSheet.getLastColumn();

    // 返答メッセージ
    let message = "";

    // 処理区分の取得
    const shoriKbn = shoriKbnGet(spreadSheet, allMsg[0]);

    switch (shoriKbn) {
      case "1":
        allMsg.shift();
        message = dataAdd(taskSheet, lastRow, lastColumn, allMsg);
        break;
      case "2":
        allMsg.shift();
        message = deleteRow(taskSheet, lastRow, allMsg);
        break;
      case "3":
        message = returnData(taskSheet, lastRow, lastColumn);
        break;
      default:
        message = "エラーが発生しました。";
        break;
    }

    // lineで返答する
    lineReply(message, replyToken);

  } catch (e) {
    let message = "エラーが発生しました。" + e;
    lineReply(message, replyToken);
  }

}
