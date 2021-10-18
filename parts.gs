/**
 * 処理区分取得処理
 * @param spredSheet スプレッドシート
 * @param inputMsg 入力メッセージ
 * @return 処理区分
 */
function shoriKbnGet(spreadSheet, inputMsg) {

  const msgSheet = spreadSheet.getSheetByName("メッセージ");
  const lastRow = msgSheet.getLastRow();
  const lastColumn = msgSheet.getLastColumn();
  const msgArray = msgSheet.getRange(2, 1, lastRow, lastColumn).getValues();
  // メッセージマスタと入力メッセージを比較し、処理区分を決定する。
  for (const msg of msgArray) {
    if (inputMsg.indexOf(msg[0]) != -1) {
      return msg[1];
    }
  }
  return "";
}

/**
 * バリデーションチェック処理
 * @param sheet シート
 * @param lastRow 最終行
 * @param lastColumn 最終列
 * @param allMsg インプットメッセージ
 * @return エラーメッセージ
 */
function execValid(lastColumn, allMsg) {

  if (allMsg.length !== lastColumn) {
    return "以下の形式で送信して下さい。\n\n登録 登録して 等\nタスク名\n完了期限(yyyyMMdd)";
  }

  if (!allMsg[1].match("^[0-9]{8}$")) {
    return "期限はyyyyMMdd形式で指定してください。"
  }

  const y = allMsg[1].substr(0, 4);
  const m = allMsg[1].substr(4, 2);
  const d = allMsg[1].substr(6, 2);
  const date = new Date(y, m - 1, d);
  if (m != date.getMonth() + 1) {
    return "無効な日付です。"
  }

  return "";
}

/**
 * データ登録処理
 * @param taskSheet シート
 * @param lastRow 最終行
 * @param lastColumn 最終列
 * @param allMsg インプットメッセージ
 * @return 正常終了メッセージ or エラーメッセージ
 */
function dataAdd(taskSheet, lastRow, lastColumn, allMsg) {
  //受信メッセージが正しい形式か確認
  const errorMsg = execValid(lastColumn, allMsg);
  if (errorMsg) {
    return errorMsg;
  }

  // タスクを書き込む
  const newRow = lastRow + 1;
  allMsg.forEach((msg, i) => taskSheet.getRange(newRow, i + 1).setValue(msg));
  // 完了期限順でソートしておく
  taskSheet.getRange(2, 1, lastRow + 1, lastColumn).sort(2);
  return "データを登録しました。";
}

/**
 * データ取得処理
 * @param taskSheet シート
 * @param lastRow 最終行
 * @param lastColumn 最終列
 * @return dataObj データオブジェクト
 */
function dataGet(taskSheet, lastRow, lastColumn) {

  const taskArray = taskSheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const header = taskArray.shift();
  const dataObj = {
    header: header,
    data: taskArray
  };

  return dataObj;
}

/**
 * データ返却処理
 * @param taskSheet シート
 * @param lastRow 最終行
 * @param lastColumn 最終列
 * @return reTaskArray リプライ用タスクリスト
 */
function returnData(taskSheet, lastRow, lastColumn) {
  // データがあるか判定
  if (lastRow == 1) {
    return "タスクがありません。";
  }

  // タスクを全て取得し、返却用メッセージに編集する。
  let reTaskArray = "現在登録されているタスクです。\n";
  const dataObj = dataGet(taskSheet, lastRow, lastColumn);
  const taskArray = dataObj.data;
  const header = dataObj.header;
  taskArray.forEach(taskRow => {
    // タスクごとに改行を入れる。
    reTaskArray += "\n";
    taskRow.forEach((taskColumn, i) => reTaskArray += `${header[i]}:${taskColumn}\n`);

  })
  return reTaskArray;
}

/**
 * データ削除処理
 * @param taskSheet シート
 * @param lastRow 最終行
 * @param allMsg インプットメッセージ
 * @return 正常終了メッセージ or エラーメッセージ
 */
function deleteRow(taskSheet, lastRow, allMsg) {
  const key = allMsg[0];
  for (let i = 1; i <= lastRow; i++) {
    const data = taskSheet.getRange(i, 1).getValue();
    if (key === data) {
      taskSheet.deleteRow(i);
      return "完了タスクを削除しました。";
    }
  }

  return "入力されたタスクがありません。"
}

/**
 * トリガー設定処理
 */
function setTrigger() {
  const date = new Date();
  date.setHours(9);
  date.setMinutes(00);
  date.setSeconds(0);
  ScriptApp.newTrigger('remind').timeBased().at(date).create();
}

/**
 * リマインド処理
 */
function remind() {
  // データを書き込むスプレッドシートを定義
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("タスク");
  // スプレッドシートからタスクを取得
  const dataObj = dataGet(sheet, sheet.getLastRow(), sheet.getLastColumn());
  // 現在日時の取得
  const keyDate = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
  let message = "";
  const taskArray = dataObj.data;
  const header = dataObj.header;
  taskArray.forEach((taskRow) => {
    const date = taskRow[1];
    if (date == keyDate) {
      message += "\n";
      taskRow.forEach((task, i) => message += `${header[i]}:${task}\n`)
    }
  })
  // リマインドするタスクが無い場合は処理しない。
  if (!message) {
    return;
  }
  push(`今日期限のタスクです。\n"${message}`);
}

/**
 * メッセージ送信処理
 * @param message メッセージ
 */
function push(message) {

  //プロパティを取得
  const scriptProperties = PropertiesService.getScriptProperties();
  const LINE_TOKEN = scriptProperties.getProperty("LINE_TOKEN");
  const USER_ID = scriptProperties.getProperty("USER_ID");
  const LINE_PUSH_URL = scriptProperties.getProperty("LINE_PUSH_URL");

  const headers = {
    "Content-Type": "application/json; charset=UTF-8",
    "Authorization": `Bearer ${LINE_TOKEN}`
  };

  const postData = {
    "to": USER_ID,
    "messages": [
      {
        'type': 'text',
        'text': message,
      }
    ]
  };

  const options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(postData)
  };

  // lineで応答する
  UrlFetchApp.fetch(LINE_PUSH_URL, options);
}

/**
 * メッセージ応答処理
 * @param message メッセージ
 * @param replyToken リプライトークン
 */
function lineReply(message, replyToken) {

  //プロパティを取得
  const scriptProperties = PropertiesService.getScriptProperties();
  const LINE_TOKEN = scriptProperties.getProperty("LINE_TOKEN");
  const LINE_REPLY_URL = scriptProperties.getProperty("LINE_REPLY_URL");

  const headers = {
    "Content-Type": 'application/json; charset=UTF-8',
    "Authorization": `Bearer ${LINE_TOKEN}`
  };

  const postData = {
    "replyToken": replyToken,
    "messages": [
      {
        "type": "text",
        "text": message
      }
    ]
  };

  const options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(postData)
  };

  //lineで返答する
  UrlFetchApp.fetch(LINE_REPLY_URL, options);

}