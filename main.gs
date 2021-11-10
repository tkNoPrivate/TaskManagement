//postリクエストを受取ったときに発火する関数
function doPost(e) {
  // 応答用Tokenを取得。
  const replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  // メッセージを取得
  const userMessage = JSON.parse(e.postData.contents).events[0].message.text;
  try {

    //メッセージを改行ごとに分割
    const allMsg = userMessage.split(NEW_LINE);
    // スプレッドシートの取得
    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();

    // 処理区分の取得
    const shoriKbn = shoriKbnGet(spreadSheet.getSheetByName(SHEET_MESSAGE), allMsg[0]);
    // データを書き込むスプレッドシートを定義
    const taskSheet = spreadSheet.getSheetByName(SHEET_TASK);
    // 返答メッセージ
    let message = "";
    switch (shoriKbn) {
      case SHORI_KBN_INS:
        allMsg.shift();
        message = dataAdd(taskSheet, allMsg);
        break;
      case SHORI_KBN_DEL:
        allMsg.shift();
        message = deleteRow(taskSheet, allMsg);
        break;
      case SHORI_KBN_GET:
        message = returnData(taskSheet);
        break;
      default:
        message = "メッセージマスタに登録されていない文字が送信されたので処理が出来ませんでした。";
        break;
    }

    // lineで返答する
    lineReply(message, replyToken);

  } catch (e) {
    let message = "エラーが発生しました。" + e;
    lineReply(message, replyToken);
  }

}
