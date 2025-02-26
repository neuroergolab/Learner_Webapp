/**
 * Adding TimeStamp and file uploading logic
 */
import React, { useState, useEffect, useRef } from "react";
import ChatBubblev1 from "./ChatBubblev1";
import ChatHistory from "./ChatHistory";
import reset from "../../assets/reset.png";
import "../../index.css";
import { uploadData } from "../../helpers/datapipeAPI"; // Import uploadData function

// Dynamic variable to track the number of times the Reset Session button is clicked
let resetClickCount = 0;

// Dynamic export function to get the latest click count
export const getResetClickCount = () => resetClickCount;

const ChatBubble = (props) => {
  const { chatHistory, client} = props;
  const [isHovered, setIsHovered] = useState(false);
  const [history, setHistory] = useState(1);
  const [session, setSession] = useState("-1");
  const [messages, setMessages] = useState([]);
  const [errorResponse, setErrorResponse] = useState(false);
  const timer = useRef(null);
  const errorMessage = "Error in retrieving response. Please reset session.";

  // Toggle History panel
  const showHistory = () => {
    setHistory(!history);
  };

  // Takes User text from the textBox
  const userInput = (text) => {
    client?.setUserText(text);
  };

  // CSV generation function: Timestamp comes first
  const convertMessagesToCSV = (messages) => {
    const csvRows = ["timestamp, speaker, model, conduct, neurodiversity, content"]; // CSV Header
    messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro}) => {
      csvRows.push(`"${timestamp}", "${sender}", "${llmModel}", "${llmConduct}", "${llmNeuro}", "${content.replace(/"/g, '""')}"`);
    });
    return csvRows.join("\n");
  };

  // Reset Session
  const ResetHistory = async () => {
    // Update resetClickCount every time the button is clicked
    resetClickCount += 1;
    console.log("Reset button clicked:", getResetClickCount(), "times");

    // Generate a filename with a timestamp suffix
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const filename = `chatHistory_${timestamp}.csv`;

    // Convert current message history to CSV
    const csvData = convertMessagesToCSV(messages);

    try {
      // Upload CSV file
      const response = await uploadData(filename, csvData);
      if (response.ok) {
        console.log(`Chat history uploaded successfully as ${filename}`);
      } else {
        console.error("Failed to upload chat history:", response.statusText);
      }
    } catch (error) {
      console.error("Error uploading chat history:", error);
    }

    // Clear message history and reset
    const storedData = localStorage.getItem("messages");

    try {
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        parsedData[client?.characterId] = {
          sessionID: -1,
          message: [],
        };
        localStorage.setItem("messages", JSON.stringify(parsedData));
      } else {
        const initialData = {
          [client?.characterId]: {
            sessionID: -1,
            message: [],
          },
        };
        localStorage.setItem("messages", JSON.stringify(initialData));
      }
    } catch (error) {
      console.error("Failed to parse or update storedData during ResetHistory:", error);
    }

    if (client?.convaiClient?.current) {
      client?.convaiClient.current.resetSession();
    }
    setSession("-1");
    setMessages([]);
    client?.setUserText("");
    client?.setNpcText("");
  };

  // Retrieve Latest chat history of a particular character
  useEffect(() => {
    const storedData = localStorage.getItem("messages");

    try {
      if (storedData) {
        const parsedData = JSON.parse(storedData);

        if (client?.characterId && parsedData[client.characterId]) {
          const parsedSessionID = parsedData[client.characterId]?.sessionID || "-1";
          setSession(parsedSessionID);

          const parsedMessages = parsedData[client.characterId]?.message || [];
          setMessages(Array.isArray(parsedMessages) ? parsedMessages : []);
        } else {
          setSession("-1");
          setMessages([]);
        }
      } else {
        setSession("-1");
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to parse storedData in useEffect:", error);
      setSession("-1");
      setMessages([]);
    }
  }, [client?.characterId]);

  // Store latest User and NPC Messages into the chat history
  useEffect(() => {
    if (
      client?.convaiClient?.current &&
      session === "-1" &&
      client?.convaiClient?.current?.sessionId
    ) {
      setSession(client.convaiClient.current.sessionId);
    }
    if (client?.characterId && messages.length) {
      const storedData = localStorage.getItem("messages");

      try {
        const parsedData = storedData ? JSON.parse(storedData) : {};
        parsedData[client.characterId] = {
          sessionID: session,
          message: messages,
        };
        localStorage.setItem("messages", JSON.stringify(parsedData));
      } catch (error) {
        console.error("Failed to parse or update storedData in message storage:", error);
      }
    }
  }, [client?.characterId, messages, session]);

  // Stores User message with timestamp
  useEffect(() => {
    if (client?.userText !== "" && client?.userEndOfResponse) {
      const newMessage = {
        sender: "user",
        content: client?.userText,
        timestamp: new Date().toISOString(),
        llmModel: "N/A",
        llmConduct:"N/A",
        llmNeuro: "N/A"
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      client?.setUserEndOfResponse(false);
      timer.current = setTimeout(() => {
        setErrorResponse(true);
      }, 7000);
    }
  }, [client?.userEndOfResponse, client?.userText]);

  // Stores NPC's message with timestamp
  useEffect(() => {
    console.log(client.npcName);
    if (errorResponse && !client?.npcText) {
      client.npcText = errorMessage;
      const newMessage = {
        sender: client?.npcName ? client.npcName : client.characterId,
        content: errorMessage,
        timestamp: new Date().toISOString(),
        llmModel: props.llmModel,
        llmConduct:props.llmConduct,
        llmNeuro: props.llmNeuro
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setErrorResponse(false);
    } else {
      if (client?.npcText !== "" && !client?.isTalking) {
        const newMessage = {
          sender: client?.npcName ? client.npcName : client.characterId,
          content: client?.npcText,
          timestamp: new Date().toISOString(),
          llmModel: props.llmModel,
          llmConduct:props.llmConduct,
          llmNeuro: props.llmNeuro
        };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        clearTimeout(timer.current);
        setErrorResponse(false);
      }
    }
  }, [client?.isTalking, errorResponse, client?.npcText]);

  return (
    <section className="ChatBubble">
      <div style={{ display: "flex" }}>
        <div
          style={{
            backgroundColor: isHovered ? "rgba(0, 0, 0, 1)" : "rgba(0, 0, 0, 0.7)",
            borderRadius: "10px",
            width: "8vw",
            height: "2.5vw",
            color: "white",
            display: "flex",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: "10px",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={ResetHistory}
        >
          <img loading="lazy" src={reset} height="20vw" width="20vw" alt="reset chat" />
          <p style={{ fontSize: "0.78vw", marginLeft: "7px", fontWeight: "bold" }}>Reset Session</p>
        </div>
      </div>
      {chatHistory === "Show" && <ChatHistory history={history} messages={messages} showHistory={showHistory} />}
      <ChatBubblev1 npcText={client?.npcText} userText={client?.userText} messages={messages} keyPressed={client?.keyPressed} />
    </section>
  );
};

export default ChatBubble;



/**
 * Before adding timestamp
 * 
 */

// import React from "react";
// import { useState, useEffect, useRef } from "react";
// import ChatBubblev1 from "./ChatBubblev1";
// import ChatHistory from "./ChatHistory";
// import reset from "../../assets/reset.png";
// import "../../index.css";

// // 动态变量，用于记录 Reset Session 按钮的点击次数
// let resetClickCount = 0; // 初始值为 0

// // 动态导出函数，获取最新的点击次数
// export const getResetClickCount = () => resetClickCount;

// const ChatBubble = (props) => {
//   const { chatHistory, client } = props;
//   const [isHovered, setIsHovered] = useState(false);
//   const [history, setHistory] = useState(1);
//   const [session, setSession] = useState("-1");
//   const [messages, setMessages] = useState([]);
//   const [errorResponse, setErrorResponse] = useState(false);
//   const timer = useRef(null);
//   const errorMessage = "Error in retrieving response. Please reset session.";

//   // Toggle History panel
//   const showHistory = () => {
//     setHistory(!history);
//   };

//   // Takes User text from the textBox
//   const userInput = (text) => {
//     client?.setUserText(text);
//   };

//   // Reset Session
//   const ResetHistory = () => {
//     // 每次点击按钮时，更新 resetClickCount
//     resetClickCount += 1;
//     console.log("Reset button clicked:", getResetClickCount(), "times");

//     // 从 localStorage 获取存储数据
//     const storedData = localStorage.getItem("messages");

//     try {
//       if (storedData) {
//         // 解析成功后更新数据
//         const parsedData = JSON.parse(storedData);
//         parsedData[client?.characterId] = {
//           sessionID: -1,
//           message: [""],
//         };
//         localStorage.setItem("messages", JSON.stringify(parsedData));
//       } else {
//         // 初始化存储数据
//         const initialData = {
//           [client?.characterId]: {
//             sessionID: -1,
//             message: [""],
//           },
//         };
//         localStorage.setItem("messages", JSON.stringify(initialData));
//       }
//     } catch (error) {
//       console.error("Failed to parse or update storedData during ResetHistory:", error);
//     }

//     if (client?.convaiClient?.current) {
//       client?.convaiClient.current.resetSession();
//     }
//     setSession("-1");
//     setMessages([]);
//     client?.setUserText("");
//     client?.setNpcText("");
//   };

//   // Retrieve Latest chat history of a particular character
//   useEffect(() => {
//     const storedData = localStorage.getItem("messages");

//     try {
//       if (storedData) {
//         // 解析存储数据
//         const parsedData = JSON.parse(storedData);

//         if (client?.characterId && parsedData[client.characterId]) {
//           const parsedSessionID = parsedData[client.characterId]?.sessionID || "-1";
//           setSession(parsedSessionID);

//           const parsedMessages = parsedData[client.characterId]?.message || [];
//           setMessages(Array.isArray(parsedMessages) ? parsedMessages : []);
//         } else {
//           setSession("-1");
//           setMessages([]);
//         }
//       } else {
//         setSession("-1");
//         setMessages([]);
//       }
//     } catch (error) {
//       console.error("Failed to parse storedData in useEffect:", error);
//       setSession("-1");
//       setMessages([]);
//     }
//   }, [client?.characterId]);

//   // Store latest User and Npc Messages into the chat history
//   useEffect(() => {
//     if (
//       client?.convaiClient?.current &&
//       session === "-1" &&
//       client?.convaiClient?.current?.sessionId
//     ) {
//       setSession(client.convaiClient.current.sessionId);
//     }
//     if (client?.characterId && messages.length) {
//       const messagesJSON = JSON.stringify(messages);

//       const storedData = localStorage.getItem("messages");

//       try {
//         if (storedData) {
//           const parsedData = JSON.parse(storedData);
//           parsedData[client.characterId] = {
//             sessionID: session,
//             message: messagesJSON,
//           };
//           localStorage.setItem("messages", JSON.stringify(parsedData));
//         } else {
//           const messagesData = {
//             [client.characterId]: {
//               sessionID: session,
//               message: messagesJSON,
//             },
//           };
//           localStorage.setItem("messages", JSON.stringify(messagesData));
//         }
//       } catch (error) {
//         console.error("Failed to parse or update storedData in message storage:", error);
//       }
//     }
//   }, [client?.characterId, messages, session]);

//   // Stores User message
//   useEffect(() => {
//     const newMessage = {
//       sender: "user",
//       content: client?.userText,
//     };
//     if (client?.userText !== "" && client?.userEndOfResponse) {
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       client?.setUserEndOfResponse(false);
//       timer.current = setTimeout(() => {
//         setErrorResponse(true);
//       }, 7000);
//     }
//   }, [client?.userEndOfResponse, client?.userText]);

//   // Stores Npc's message
//   useEffect(() => {
//     if (errorResponse && !client?.npcText) {
//       client.npcText = errorMessage;
//       const newMessage = {
//         sender: "npc",
//         content: errorMessage,
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       setErrorResponse(false);
//     } else {
//       const newMessage = {
//         sender: "npc",
//         content: client?.npcText,
//       };
//       if (client?.npcText !== "") {
//         setErrorResponse(false);
//         clearTimeout(timer.current);
//       }
//       if (client?.npcText !== "" && !client?.isTalking) {
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
//       }
//     }
//   }, [client?.isTalking, errorResponse, client?.npcText]);

//   return (
//     <section className="ChatBubble">
//       <div style={{ display: "flex" }}>
//         <div
//           style={{
//             backgroundColor: isHovered ? "rgba(0, 0, 0, 1)" : "rgba(0, 0, 0, 0.7)",
//             borderRadius: "10px",
//             width: "8vw",
//             height: "2.5vw",
//             color: "white",
//             display: "flex",
//             justifyContent: "center",
//             cursor: "pointer",
//             marginBottom: "10px",
//           }}
//           onMouseEnter={() => setIsHovered(true)}
//           onMouseLeave={() => setIsHovered(false)}
//           onClick={ResetHistory}
//         >
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               loading="lazy"
//               src={reset}
//               height="20vw"
//               width="20vw"
//               alt="reset chat"
//             ></img>
//           </div>
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               marginLeft: "7px",
//               fontWeight: "bold",
//             }}
//           >
//             <p style={{ fontSize: "0.78vw" }}>Reset Session</p>
//           </div>
//         </div>
//       </div>
//       {chatHistory === "Show" && (
//         <ChatHistory
//           history={history}
//           messages={messages}
//           showHistory={showHistory}
//           npcName={client?.npcName ? client.npcName : "Npc"}
//           userName={client?.userName ? client.userName : "User"}
//         ></ChatHistory>
//       )}
//       <ChatBubblev1
//         npcText={client?.npcText}
//         userText={client?.userText}
//         messages={messages}
//         keyPressed={client?.keyPressed}
//       ></ChatBubblev1>
//     </section>
//   );
// };

// export default ChatBubble;

// import React from "react";
// import { useState, useEffect, useRef } from "react";
// import ChatBubblev1 from "./ChatBubblev1";
// import ChatHistory from "./ChatHistory";
// import reset from "../../assets/reset.png";
// import "../../index.css";

// // 动态变量，用于记录 Reset Session 按钮的点击次数
// let resetClickCount = 0; // 初始值为 0

// // 动态导出函数，获取最新的点击次数
// export const getResetClickCount = () => resetClickCount;

// const ChatBubble = (props) => {
//   const { chatHistory, client } = props;
//   const [isHovered, setIsHovered] = useState(false);
//   const [history, setHistory] = useState(1);
//   const [session, setSession] = useState("-1");
//   const [messages, setMessages] = useState([]);
//   const [errorResponse, setErrorResponse] = useState(false);
//   const timer = useRef(null);
//   const errorMessage = " Error in retrieving response. Please reset session.";

//   // Toggle History panel
//   const showHistory = () => {
//     setHistory(!history);
//   };

//   // Takes User text from the textBox
//   const userInput = (text) => {
//     client?.setUserText(text);
//   };

//   // Reset Session
//   const ResetHistory = () => {
//     // 每次点击按钮时，更新 resetClickCount
//     resetClickCount += 1;
//     console.log('Reset button clicked:', getResetClickCount(), 'times');
//     const storedData = localStorage.getItem("messages");
//     if (storedData) {
//       try {
//         const parsedData = JSON.parse(storedData); // 确保解析成功
//         parsedData[client?.characterId] = {
//           sessionID: -1,
//           message: [""],
//         };
//         localStorage.setItem("messages", JSON.stringify(parsedData)); // 存储有效 JSON
//       } catch (error) {
//         console.error("Failed to parse storedData during ResetHistory:", error);
//       }
//     } else {
//       // 如果没有数据，初始化存储
//       const initialData = {
//         [client?.characterId]: {
//           sessionID: -1,
//           message: [""],
//         },
//       };
//       localStorage.setItem("messages", JSON.stringify(initialData));
//     }

//     if (client?.convaiClient?.current) {
//       client?.convaiClient.current.resetSession();
//     }
//     setSession("-1");
//     setMessages([]);
//     client?.setUserText("");
//     client?.setNpcText("");
//   };

//   // Retrieve Latest chat history of a particular character
//   useEffect(() => {
//     const storedData = localStorage.getItem("messages");
//     if (storedData) {
//       try {
//         const parsedData = JSON.parse(storedData); // 解析前检查
//         const characterIDs = Object.keys(parsedData);

//         if (characterIDs.includes(client?.characterId)) {
//           const parsedSessionID = parsedData[client?.characterId].sessionID;
//           if (parsedSessionID) {
//             setSession(parsedSessionID);
//           }

//           const parsedMessage = parsedData[client?.characterId].message;
//           if (parsedMessage) {
//             const storedMessages = JSON.parse(parsedMessage); // 再次验证
//             setMessages(storedMessages);
//           }
//         } else {
//           setMessages([]);
//         }
//       } catch (error) {
//         console.error("Failed to parse storedData in useEffect:", error);
//       }
//     } else {
//       setSession("-1");
//       setMessages([]);
//     }
//   }, [client?.characterId]);

//   // Store latest User and Npc Messages into the chat history
//   useEffect(() => {
//     if (
//       client?.convaiClient?.current &&
//       session === "-1" &&
//       client?.convaiClient?.current?.sessionId
//     ) {
//       setSession(client.convaiClient.current.sessionId);
//     }
//     if (client?.characterId && messages.length) {
//       const messagesJSON = JSON.stringify(messages);
//       const storedData = localStorage.getItem("messages");

//       if (storedData) {
//         try {
//           const parsedData = JSON.parse(storedData);
//           parsedData[client.characterId] = {
//             sessionID: session,
//             message: messagesJSON,
//           };
//           localStorage.setItem("messages", JSON.stringify(parsedData));
//         } catch (error) {
//           console.error("Failed to parse storedData in message storage:", error);
//         }
//       } else {
//         // 没有存储数据时初始化
//         const messagesData = {
//           [client.characterId]: {
//             sessionID: session,
//             message: messagesJSON,
//           },
//         };
//         localStorage.setItem("messages", JSON.stringify(messagesData));
//       }
//     }
//   }, [client?.characterId, messages, session]);

//   // Stores User message
//   useEffect(() => {
//     const newMessage = {
//       sender: "user",
//       content: client?.userText,
//     };
//     if (client?.userText !== "" && client?.userEndOfResponse) {
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       client?.setUserEndOfResponse(false);
//       timer.current = setTimeout(() => {
//         setErrorResponse(true);
//       }, 7000);
//     }
//   }, [client?.userEndOfResponse, client?.userText]);

//   // Stores Npc's message
//   useEffect(() => {
//     if (errorResponse && !client?.npcText) {
//       client.npcText = errorMessage;
//       const newMessage = {
//         sender: "npc",
//         content: errorMessage,
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       setErrorResponse(false);
//     } else {
//       const newMessage = {
//         sender: "npc",
//         content: client?.npcText,
//       };
//       if (client?.npcText !== "") {
//         setErrorResponse(false);
//         clearTimeout(timer.current);
//       }
//       if (client?.npcText !== "" && !client?.isTalking) {
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
//       }
//     }
//   }, [client?.isTalking, errorResponse, client?.npcText]);

//   return (
//     <section className="ChatBubble">
//       <div style={{ display: "flex" }}>
//         <div
//           style={{
//             backgroundColor: isHovered
//               ? "rgba(0, 0, 0, 1)"
//               : "rgba(0, 0, 0, 0.7)",
//             borderRadius: "10px",
//             width: "8vw",
//             height: "2.5vw",
//             color: "white",
//             display: "flex",
//             justifyContent: "center",
//             cursor: "pointer",
//             marginBottom: "10px",
//           }}
//           onMouseEnter={() => setIsHovered(true)}
//           onMouseLeave={() => setIsHovered(false)}
//           onClick={ResetHistory}
//         >
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               loading="lazy"
//               src={reset}
//               height="20vw"
//               width="20vw"
//               alt="reset chat"
//             ></img>
//           </div>
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               marginLeft: "7px",
//               fontWeight: "bold",
//             }}
//           >
//             <p style={{ fontSize: "0.78vw" }}>Reset Session</p>
//           </div>
//         </div>
//       </div>
//       {chatHistory === "Show" && (
//         <ChatHistory
//           history={history}
//           messages={messages}
//           showHistory={showHistory}
//           npcName={client?.npcName ? client.npcName : "Npc"}
//           userName={client?.userName ? client.userName : "User"}
//         ></ChatHistory>
//       )}
//       <ChatBubblev1
//         npcText={client?.npcText}
//         userText={client?.userText}
//         messages={messages}
//         keyPressed={client?.keyPressed}
//       ></ChatBubblev1>
//     </section>
//   );
// };

// export default ChatBubble;

// import React from "react";
// import { useState, useEffect, useRef } from "react";
// import ChatBubblev1 from "./ChatBubblev1";
// import ChatHistory from "./ChatHistory";
// import reset from "../../assets/reset.png";
// import "../../index.css";

// // 动态变量，用于记录 Reset Session 按钮的点击次数
// let resetClickCount = 0; // 初始值为 0

// // 动态导出函数，获取最新的点击次数
// export const getResetClickCount = () => resetClickCount;

// const ChatBubble = (props) => {
//   const { chatHistory, client } = props;
//   const [isHovered, setIsHovered] = useState(false);
//   const [history, setHistory] = useState(1);
//   const [session, setSession] = useState("-1");
//   const [messages, setMessages] = useState([]);
//   const [errorResponse, setErrorResponse] = useState(false);
//   const timer = useRef(null);
//   const errorMessage = " Error in retrieving response. Please reset session.";

//   // Toggle History panel
//   const showHistory = () => {
//     setHistory(!history);
//   };

//   // Takes User text from the textBox
//   const userInput = (text) => {
//     client?.setUserText(text);
//   };

//   // Reset Session
//   const ResetHistory = () => {
//     // 每次点击按钮时，更新 resetClickCount
//     resetClickCount += 1;

//     const storedData = localStorage.getItem("messages");
//     if (storedData) {
//       // Parse the retrieved data from JSON format
//       const parsedData = JSON.parse(storedData);
//       // Update the messages for the current character ID in the stored data
//       parsedData[client?.characterId] = {
//         sessionID: -1,
//         message: [""],
//       };
//       // Update the stored data in localStorage
//       localStorage.setItem("messages", JSON.stringify(parsedData));
//     }
//     if (client?.convaiClient?.current) {
//       client?.convaiClient.current.resetSession();
//     }
//     setSession("-1");
//     setMessages([]);
//     client?.setUserText("");
//     client?.setNpcText("");
//   };

//   // Retrieve Latest chat history of a particular character
//   useEffect(() => {
//     // Retrieve stored data from localStorage
//     const storedData = localStorage.getItem("messages");

//     if (client?.characterId) {
//       if (storedData) {
//         // Parse the retrieved data from JSON format
//         const parsedData = JSON.parse(storedData);

//         const characterIDs = Object.keys(parsedData);

//         // Check if character ID matches the stored character ID
//         if (characterIDs.includes(client?.characterId)) {
//           // Retrieve the sessionID for the current character ID
//           const parsedSessionID = parsedData[client?.characterId].sessionID;
//           if (parsedSessionID) {
//             // Update the sessionID state
//             setSession(parsedSessionID);
//           }

//           // Retrieve the messages for the current character ID
//           const parsedMessage = parsedData[client?.characterId].message;
//           if (parsedMessage) {
//             const storedMessages = JSON.parse(parsedMessage);

//             // Update the messages state
//             setMessages(storedMessages);
//           }
//         } else {
//           // No stored messages for the current character ID
//           setMessages([]);
//         }
//       } else {
//         // No stored data
//         setSession("-1");
//         setMessages([]);
//       }
//     }
//   }, [client?.characterId]);

//   // Store latest User and Npc Messages into the chat history
//   useEffect(() => {
//     // Used to set the session Id on the 1st interaction
//     if (
//       client?.convaiClient?.current &&
//       session === "-1" &&
//       client?.convaiClient?.current?.sessionId
//     ) {
//       setSession(client.convaiClient.current.sessionId);
//     }
//     if (client?.characterId && messages.length) {
//       const messagesJSON = JSON.stringify(messages);
//       const storedData = localStorage.getItem("messages");

//       if (storedData) {
//         // Parse the retrieved data from JSON format
//         const parsedData = JSON.parse(storedData);

//         // Update the messages for the current character ID in the stored data
//         parsedData[client.characterId] = {
//           sessionID: session,
//           message: messagesJSON,
//         };
//         // Update the stored data in localStorage
//         localStorage.setItem("messages", JSON.stringify(parsedData));
//       } else {
//         // No stored data, create a new entry for the current character ID
//         const messagesData = {
//           [client.characterId]: {
//             sessionID: session,
//             message: messagesJSON,
//           },
//         };
//         localStorage.setItem("messages", JSON.stringify(messagesData));
//       }
//     }
//   }, [client?.characterId, messages, session]);

//   // Stores User message
//   useEffect(() => {
//     const newMessage = {
//       sender: "user",
//       content: client?.userText,
//     };
//     if (client?.userText !== "" && client?.userEndOfResponse) {
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       client?.setUserEndOfResponse(false);
//       timer.current = setTimeout(() => {
//         setErrorResponse(true);
//       }, 7000);
//     }
//   }, [client?.userEndOfResponse, client?.userText]);

//   // Stores Npc's message
//   useEffect(() => {
//     if (errorResponse && !client?.npcText) {
//       client.npcText = errorMessage;
//       const newMessage = {
//         sender: "npc",
//         content: errorMessage,
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       setErrorResponse(false);
//     } else {
//       const newMessage = {
//         sender: "npc",
//         content: client?.npcText,
//       };
//       if (client?.npcText !== "") {
//         setErrorResponse(false);
//         clearTimeout(timer.current);
//       }
//       if (client?.npcText !== "" && !client?.isTalking) {
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
//       }
//     }
//   }, [client?.isTalking, errorResponse, client?.npcText]);

//   return (
//     <section className="ChatBubble">
//       <div style={{ display: "flex" }}>
//         <div
//           style={{
//             backgroundColor: isHovered
//               ? "rgba(0, 0, 0, 1)"
//               : "rgba(0, 0, 0, 0.7)",
//             borderRadius: "10px",
//             width: "8vw",
//             height: "2.5vw",
//             color: "white",
//             display: "flex",
//             justifyContent: "center",
//             cursor: "pointer",
//             marginBottom: "10px",
//           }}
//           onMouseEnter={() => setIsHovered(true)}
//           onMouseLeave={() => setIsHovered(false)}
//           onClick={ResetHistory}
//         >
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               loading="lazy"
//               src={reset}
//               height="20vw"
//               width="20vw"
//               alt="reset chat"
//             ></img>
//           </div>
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               marginLeft: "7px",
//               fontWeight: "bold",
//             }}
//           >
//             <p style={{ fontSize: "0.78vw" }}>Reset Session</p>
//           </div>
//         </div>
//       </div>
//       {chatHistory === "Show" && (
//         <ChatHistory
//           history={history}
//           messages={messages}
//           showHistory={showHistory}
//           npcName={client?.npcName ? client.npcName : "Npc"}
//           userName={client?.userName ? client.userName : "User"}
//         ></ChatHistory>
//       )}
//       <ChatBubblev1
//         npcText={client?.npcText}
//         userText={client?.userText}
//         messages={messages}
//         keyPressed={client?.keyPressed}
//       ></ChatBubblev1>
//     </section>
//   );
// };

// export default ChatBubble;

// import React from "react";
// import { useState, useEffect, useRef } from "react";
// import ChatBubblev1 from "./ChatBubblev1";
// import ChatHistory from "./ChatHistory";
// import reset from "../../assets/reset.png";
// import "../../index.css";

// const ChatBubble = (props) => {
//   const { chatHistory, client  } = props;
//   const [isHovered, setIsHovered] = useState(false);
//   const [history, setHistory] = useState(1);
//   const [session, setSession] = useState("-1");
//   const [messages, setMessages] = useState([]);
//   const [errorResponse, setErrorResponse] = useState(false);
//   const timer = useRef(null);
//   const errorMessage = " Error in retrieving response. Please reset session.";
//   //Toggle History panel
//   const showHistory = () => {
//     setHistory(!history);
//   };

//   //Takes User text from the textBox
//   const userInput = (text) => {
//     client?.setUserText(text);
//   };

//   //Reset Session
//   const ResetHistory = () => {
//     const storedData = localStorage.getItem("messages");
//     if (storedData) {
//       // Parse the retrieved data from JSON format
//       const parsedData = JSON.parse(storedData);
//       // Update the messages for the current character ID in the stored data
//       parsedData[client?.characterId] = {
//         sessionID: -1,
//         message: [""],
//       };
//       // Update the stored data in localStorage
//       localStorage.setItem("messages", JSON.stringify(parsedData));
//     }
//     if (client?.convaiClient?.current) {
//       client?.convaiClient.current.resetSession();
//     }
//     setSession("-1");
//     setMessages([]);
//     client?.setUserText("");
//     client?.setNpcText("");
//   };

//   //Retrieve Latest chat history of a particular character
//   useEffect(() => {
//     // Retrieve stored data from localStorage
//     const storedData = localStorage.getItem("messages");

//     if (client?.characterId) {
//       if (storedData) {
//         // Parse the retrieved data from JSON format
//         const parsedData = JSON.parse(storedData);

//         const characterIDs = Object.keys(parsedData);

//         // Check if character ID matches the stored character ID
//         if (characterIDs.includes(client?.characterId)) {
//           // Retrieve the sessionID for the current character ID
//           const parsedSessionID = parsedData[client?.characterId].sessionID;
//           if (parsedSessionID) {
//             // Update the sessionID state
//             setSession(parsedSessionID);
//           }

//           // Retrieve the messages for the current character ID
//           const parsedMessage = parsedData[client?.characterId].message;
//           if (parsedMessage) {
//             const storedMessages = JSON.parse(parsedMessage);

//             // Update the messages state
//             setMessages(storedMessages);
//           }
//         } else {
//           // No stored messages for the current character ID
//           setMessages([]);
//         }
//       } else {
//         // No stored data
//         setSession("-1");
//         setMessages([]);
//       }
//     }
//   }, [client?.characterId]);

//   //Store latest User and Npc Messages into the chat history
//   useEffect(() => {
//     //Used to set the session Id on the 1st interaction
//     if (
//       client?.convaiClient?.current &&
//       session === "-1" &&
//       client?.convaiClient?.current?.sessionId
//     ) {
//       setSession(client.convaiClient.current.sessionId);
//     }
//     if (client?.characterId && messages.length) {
//       const messagesJSON = JSON.stringify(messages);
//       const storedData = localStorage.getItem("messages");

//       if (storedData) {
//         // Parse the retrieved data from JSON format
//         const parsedData = JSON.parse(storedData);

//         // Update the messages for the current character ID in the stored data
//         parsedData[client.characterId] = {
//           sessionID: session,
//           message: messagesJSON,
//         };
//         // Update the stored data in localStorage
//         localStorage.setItem("messages", JSON.stringify(parsedData));
//       } else {
//         // No stored data, create a new entry for the current character ID
//         const messagesData = {
//           [client.characterId]: {
//             sessionID: session,
//             message: messagesJSON,
//           },
//         };
//         localStorage.setItem("messages", JSON.stringify(messagesData));
//       }
//     }
//   }, [client?.characterId, messages, session]);

//   // Stores User message
//   useEffect(() => {
//     const newMessage = {
//       sender: "user",
//       content: client?.userText,
//     };
//     if (client?.userText !== "" && client?.userEndOfResponse) {
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       client?.setUserEndOfResponse(false);
//       timer.current = setTimeout(() => {
//         setErrorResponse(true);
//       }, 7000);
//     }
//   }, [client?.userEndOfResponse, client?.userText]);

//   // Stores Npc's message
//   useEffect(() => {
//     if (errorResponse && !client?.npcText) {
//       client.npcText = errorMessage;
//       const newMessage = {
//         sender: "npc",
//         content: errorMessage,
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       setErrorResponse(false);
//     } else {
//       const newMessage = {
//         sender: "npc",
//         content: client?.npcText,
//       };
//       if (client?.npcText !== "") {
//         setErrorResponse(false);
//         clearTimeout(timer.current);
//       }
//       if (client?.npcText !== "" && !client?.isTalking) {
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
//       }
//     }
//   }, [client?.isTalking, errorResponse, client?.npcText]);

//   return (
//     <section className="ChatBubble">
//       <div style={{ display: "flex" }}>
//         <div
//           style={{
//             backgroundColor: isHovered
//               ? "rgba(0, 0, 0, 1)"
//               : "rgba(0, 0, 0, 0.7)",
//             borderRadius: "10px",
//             width: "8vw",
//             height: "2.5vw",
//             color: "white",
//             display: "flex",
//             justifyContent: "center",
//             cursor: "pointer",
//             marginBottom: "10px",
//           }}
//           onMouseEnter={() => setIsHovered(true)}
//           onMouseLeave={() => setIsHovered(false)}
//           onClick={ResetHistory}
//         >
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               loading="lazy"
//               src={reset}
//               height="20vw"
//               width="20vw"
//               alt="reset chat"
//             ></img>
//           </div>
//           <div
//             style={{
//               alignSelf: "center",
//               display: "flex",
//               flexDirection: "column",
//               justifyContent: "center",
//               marginLeft: "7px",
//               fontWeight: "bold",
//             }}
//           >
//             <p style={{ fontSize: "0.78vw" }}>Reset Session</p>
//           </div>
//         </div>
//       </div>
//       {chatHistory === "Show" && (
//         <ChatHistory
//           history={history}
//           messages={messages}
//           showHistory={showHistory}
//           npcName={client?.npcName ? client.npcName : "Npc"}
//           userName={client?.userName ? client.userName : "User"}
//         ></ChatHistory>
//       )}
//       <ChatBubblev1
//         npcText={client?.npcText}
//         userText={client?.userText}
//         messages={messages}
//         keyPressed={client?.keyPressed}
//       ></ChatBubblev1>
//     </section>
//   );
// };

// export default ChatBubble;
