// src/helpers/api.js
// This jsx file used to setup the datapipe api 
export const uploadData = (filename, data) => {
    return fetch("https://pipe.jspsych.org/api/data/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        experimentID: "UX50ozI42umk", // 固定的 experimentID
        filename,                   // 动态的文件名
        data,                       // 动态的数据内容
      }),
    });
  };
  