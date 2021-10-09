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
 * 対象外(チェックなど)カラムを削除する処理
 * @param lastColumn 最終列
 * @return lastColumn - 対象外カラム数
 */
function delNonTargetColumn(lastColumn) {
  return lastColumn - NON_TARGET_COLUMN_LIST.length;
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
    return String(lastColumn) + "行で指定してください。";
  }

  if (!allMsg[1].match("^[0-9]{8}$")) {
    return "期限は数字8ケタで指定してください。"
  }

  const y = allMsg[1].substr(0, 4);
  const m = allMsg[1].substr(4, 2);
  const d = allMsg[1].substr(6, 2);
  const date = new Date(y, m - 1, d);
  if (m != date.getMonth() + 1) {
    return "無効な日付です。"
  }

  const nowDate = new Date();
  if (date.getFullYear() < nowDate.getFullYear()) {
    return "過去の日付は指定出来ません。";
  } else if (date.getMonth() < nowDate.getMonth()) {
    return "過去の日付は指定出来ません。";
  } else if (date.getDate() < nowDate.getDate()) {
    return "過去の日付は指定出来ません。";
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
  // 受信メッセージが正しい形式か確認
  // const errorMsg = execValid(delNonTargetColumn(lastColumn), allMsg);
  // if (errorMsg) {
  //   return errorMsg;
  // }

  // // タスクを書き込む
  // const newRow = lastRow + 1;
  // allMsg.forEach((msg, i) => taskSheet.getRange(newRow, i + 1).setValue(msg));

  // const triggerId = setTrigger(allMsg[1]);
  // taskSheet.getRange(lastRow + 1, 3).setValue(triggerId);
  // // 完了期限順でソートしておく
  // taskSheet.getRange(2, 1, lastRow + 1, lastColumn).sort(2);
  return "https://docs.google.com/forms/d/e/1FAIpQLSeKA1LTVMI6FtmmpfHalnx2xKP4G6VUHGkPep4GoQG1YDkeQA/viewform?usp=sf_link";
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
  let reTaskArray = "";
  const dataObj = dataGet(taskSheet, lastRow, delNonTargetColumn(lastColumn));
  const taskArray = dataObj.data;
  const header = dataObj.header;
  taskArray.forEach(taskRow => {
    taskRow.forEach((taskColumn, i) =>
      // ヘッダー + 値で設定する。
      reTaskArray += header[i] + ":" + taskColumn + "\n");
    // タスクごとに区切り文字を入れる。
    reTaskArray += "==========\n";
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
      delTrigger(taskSheet.getRange(i, 3).getValue())
      return "完了タスクを削除しました。";
    }
  }

  return "入力されたタスクがありません。"
}

/**
 * トリガー設定処理
 * @param addDate 年月日
 * @return トリガーID
 */
function setTrigger(addDate) {

  const y = addDate.substr(0, 4);
  const m = addDate.substr(4, 2);
  const d = addDate.substr(6, 2);
  const date = new Date(y, m - 1, d);
  date.setHours(18);
  date.setMinutes(29);
  const trigger = ScriptApp.newTrigger('remind').timeBased().at(date).create();
  return trigger.getUniqueId();

}

/**
 * トリガー削除処理
 * @param triggerId トリガーID
 */
function delTrigger(triggerId) {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getUniqueId() == triggerId) {
      ScriptApp.deleteTrigger(trigger);
      return;
    }
  })
}

/**
 * リマインド処理
 */
function remind() {
  // データを書き込むスプレッドシートを定義
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");
  // 最終行の取得
  const lastRow = sheet.getLastRow();
  // 現在日時の取得
  const keyDate = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
  let message = "";
  for (let i = 1; i <= lastRow; i++) {
    const data = sheet.getRange(i, 2).getValue();
    if (keyDate === data) {
      message += sheet.getRange(i, 1).getValue() + "\n" + sheet.getRange(i, 2).getValue() + "\n";
    }
    message += "==========\n";
  }
  push(message);
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