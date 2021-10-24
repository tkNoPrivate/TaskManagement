/**
 * 処理区分取得処理
 * @param msgSheet メッセージシート
 * @param inputMsg 入力メッセージ
 * @return 処理区分
 */
function shoriKbnGet(msgSheet, inputMsg) {

  const msgObjects = dataGet(msgSheet);
  //メッセージマスタと入力メッセージを比較し、処理区分を決定する。
  for (const msg of msgObjects) {
    if (inputMsg.indexOf(msg.message) != -1) {
      return msg.shorikbn;
    }
  }

  return "";
}

/**
 * バリデーションチェック処理
 * @param lastColumn 最終列
 * @param allMsg インプットメッセージ
 * @return エラーメッセージ
 */
function execValid(lastColumn, allMsg) {

  if (allMsg.length !== lastColumn) {
    return `以下の形式で送信して下さい。${NEW_LINE}${NEW_LINE}登録 登録して 等${NEW_LINE}タスク名${NEW_LINE}完了期限(yyyyMMdd)`;
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
 * @param allMsg インプットメッセージ
 * @return 正常終了メッセージ or エラーメッセージ
 */
function dataAdd(taskSheet, allMsg) {
  // 最終列の取得
  const lastColumn = taskSheet.getLastColumn();
  //受信メッセージが正しい形式か確認
  const errorMsg = execValid(lastColumn, allMsg);
  if (errorMsg) {
    return errorMsg;
  }
  // タスクを書き込む行
  const newRow = taskSheet.getLastRow() + 1;
  // タスクを書き込む
  allMsg.forEach((msg, i) => taskSheet.getRange(newRow, i + 1).setValue(msg));
  // 完了期限順でソートしておく
  taskSheet.getRange(START_ROW, START_COLUMN, newRow, lastColumn).sort(COLUMN_TIMELIMIT);
  return "データを登録しました。";
}

/**
 * データ返却処理
 * @param taskSheet シート
 * @return reTaskArray リプライ用タスクリスト
 */
function returnData(taskSheet) {
  // データがあるか判定
  if (taskSheet.getLastRow() == 1) {
    return "タスクがありません。";
  }

  // タスクを全て取得し、返却用メッセージに編集する。
  let reTaskArray = `現在登録されているタスクです。${NEW_LINE}`;
  const dataObjects = dataGet(taskSheet);
  dataObjects.forEach(dataObject => {
    // タスクごとに改行を入れる。
    reTaskArray += NEW_LINE;
    Object.keys(dataObject).forEach(key => reTaskArray += `${key}:${dataObject[key]}${NEW_LINE}`);
  });
  return reTaskArray;
}

/**
 * データ削除処理
 * @param taskSheet シート
 * @param allMsg インプットメッセージ
 * @return 正常終了メッセージ or エラーメッセージ
 */
function deleteRow(taskSheet, allMsg) {
  // 最終行の取得
  const lastRow = taskSheet.getLastRow();
  // 削除対象キー
  const key = allMsg[0];
  // 1行目から順にタスク名を比較し、一致していたら削除する。
  for (let i = START_ROW; i <= lastRow; i++) {
    const taskName = taskSheet.getRange(i, 1).getValue();
    if (key === taskName) {
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
  // 9時にトリガーを設定する
  date.setHours(9);
  date.setMinutes(0);
  date.setSeconds(0);
  ScriptApp.newTrigger('remind').timeBased().at(date).create();
}

/**
 * リマインド処理
 */
function remind() {
  // データを書き込むスプレッドシートを定義
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASK);
  // スプレッドシートからタスクを取得
  const dataObjects = dataGet(sheet);
  // 現在日時の取得
  const keyDate = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
  let message = "";
  // 現在日時とtimelimitが一致するデータをリマインドする。
  dataObjects.forEach(dataObject => {
    if (dataObject.timelimit == keyDate) {
      message += NEW_LINE;
      Object.keys(dataObject).forEach(key => message += `${key}:${dataObject[key]}${NEW_LINE}`);
    }
  });
  // リマインドするタスクが無い場合は処理しない。
  if (!message) {
    return;
  }
  push(`今日期限のタスクです。${NEW_LINE}${message}`);
}

/**
 * データ取得処理
 * マスタデータをオブジェクト化して返却する
 * 
 * @param sheet シート
 * @return dataObjects データオブジェクト
 */
function dataGet(sheet) {

  const dataArray = sheet.getRange(HEADER_ROW, START_COLUMN, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const header = dataArray.shift();
  const dataObjects = [];
  dataArray.forEach(dataRow => {
    const dataObj = {};
    dataRow.forEach((data, i) => {
      dataObj[header[i]] = data;
    });
    dataObjects.push(dataObj);
  });

  return dataObjects;
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