/**
 * Adding TimeStamp and file uploading logic
 */
import React, { useState, useEffect, useRef } from "react";
import ChatBubblev1 from "./ChatBubblev1";
import ChatHistory from "./ChatHistory";
import "../../index.css";

// Dynamic variable to track the number of times the Reset Session button is clicked
let resetClickCount = 0;

// Dynamic export function to get the latest click count
export const getResetClickCount = () => resetClickCount;

// Dynamic variable to track the number of interaction groups (one user message + one NPC response)
let interactionCount = 0;

// Export function to retrieve the current interaction count
export const getInteractionCount = () => interactionCount;

const ChatBubble = (props) => {
  const { chatHistory, client } = props;
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
        llmConduct: "N/A",
        llmNeuro: "N/A",
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
        llmConduct: props.llmConduct,
        llmNeuro: props.llmNeuro,
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
          llmConduct: props.llmConduct,
          llmNeuro: props.llmNeuro,
        };
        setMessages((prevMessages) => [...prevMessages, newMessage]);

        // Increase interaction count when NPC replies
        interactionCount += 1;
        console.log("Current interactionCount:", interactionCount);

        clearTimeout(timer.current);
        setErrorResponse(false);
      }
    }
  }, [client?.isTalking, errorResponse, client?.npcText]);

  return (
    <section className="ChatBubble">
      {/* // ❌ 移除了 Reset Session 按钮 */}
      {/*
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
          onClick={() => {
            ResetHistory(); // ❌ 这个函数逻辑已移动到 App.jsx
            interactionCount = 0; // Reset interaction count on session reset
          }}
        >
          <img loading="lazy" src={reset} height="20vw" width="20vw" alt="reset chat" />
          <p style={{ fontSize: "0.78vw", marginLeft: "7px", fontWeight: "bold" }}>Reset Session</p>
        </div>
      </div>
      */}

      {chatHistory === "Show" && <ChatHistory history={history} messages={messages} showHistory={showHistory} />}
      <ChatBubblev1 npcText={client?.npcText} userText={client?.userText} messages={messages} keyPressed={client?.keyPressed} />
    </section>
  );
};

export default ChatBubble;

// /**
//  * Adding TimeStamp and file uploading logic
//  */
// import React, { useState, useEffect, useRef } from "react";
// import ChatBubblev1 from "./ChatBubblev1";
// import ChatHistory from "./ChatHistory";
// import reset from "../../assets/reset.png";
// import "../../index.css";
// import { uploadData } from "../../helpers/datapipeAPI"; // Import uploadData function

// // Dynamic variable to track the number of times the Reset Session button is clicked
// let resetClickCount = 0;

// // Dynamic export function to get the latest click count
// export const getResetClickCount = () => resetClickCount;

// // Dynamic variable to track the number of interaction groups (one user message + one NPC response)
// let interactionCount = 0;

// // Export function to retrieve the current interaction count
// export const getInteractionCount = () => interactionCount;

// const ChatBubble = (props) => {
//   const { chatHistory, client} = props;
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

//   // CSV generation function: Timestamp comes first
//   const convertMessagesToCSV = (messages) => {
//     const csvRows = ["timestamp, speaker, model, conduct, neurodiversity, content"]; // CSV Header
//     messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro}) => {
//       csvRows.push(`"${timestamp}", "${sender}", "${llmModel}", "${llmConduct}", "${llmNeuro}", "${content.replace(/"/g, '""')}"`);
//     });
//     return csvRows.join("\n");
//   };

//   // Reset Session
//   const ResetHistory = async () => {
//     // Update resetClickCount every time the button is clicked
//     resetClickCount += 1;
//     console.log("Reset button clicked:", getResetClickCount(), "times");

//     // Generate a filename with a timestamp suffix
//     const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
//     const filename = `chatHistory_${timestamp}.csv`;

//     // Convert current message history to CSV
//     const csvData = convertMessagesToCSV(messages);

//     try {
//       // Upload CSV file
//       const response = await uploadData(filename, csvData);
//       if (response.ok) {
//         console.log(`Chat history uploaded successfully as ${filename}`);
//       } else {
//         console.error("Failed to upload chat history:", response.statusText);
//       }
//     } catch (error) {
//       console.error("Error uploading chat history:", error);
//     }

//     // Clear message history and reset
//     const storedData = localStorage.getItem("messages");

//     try {
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         parsedData[client?.characterId] = {
//           sessionID: -1,
//           message: [],
//         };
//         localStorage.setItem("messages", JSON.stringify(parsedData));
//       } else {
//         const initialData = {
//           [client?.characterId]: {
//             sessionID: -1,
//             message: [],
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

//   // Store latest User and NPC Messages into the chat history
//   useEffect(() => {
//     if (
//       client?.convaiClient?.current &&
//       session === "-1" &&
//       client?.convaiClient?.current?.sessionId
//     ) {
//       setSession(client.convaiClient.current.sessionId);
//     }
//     if (client?.characterId && messages.length) {
//       const storedData = localStorage.getItem("messages");

//       try {
//         const parsedData = storedData ? JSON.parse(storedData) : {};
//         parsedData[client.characterId] = {
//           sessionID: session,
//           message: messages,
//         };
//         localStorage.setItem("messages", JSON.stringify(parsedData));
//       } catch (error) {
//         console.error("Failed to parse or update storedData in message storage:", error);
//       }
//     }
//   }, [client?.characterId, messages, session]);

//   // Stores User message with timestamp
//   useEffect(() => {
//     if (client?.userText !== "" && client?.userEndOfResponse) {
//       const newMessage = {
//         sender: "user",
//         content: client?.userText,
//         timestamp: new Date().toISOString(),
//         llmModel: "N/A",
//         llmConduct:"N/A",
//         llmNeuro: "N/A"
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       client?.setUserEndOfResponse(false);
//       timer.current = setTimeout(() => {
//         setErrorResponse(true);
//       }, 7000);
//     }
//   }, [client?.userEndOfResponse, client?.userText]);

//   // Stores NPC's message with timestamp
//   useEffect(() => {
//     console.log(client.npcName);
//     if (errorResponse && !client?.npcText) {
//       client.npcText = errorMessage;
//       const newMessage = {
//         sender: client?.npcName ? client.npcName : client.characterId,
//         content: errorMessage,
//         timestamp: new Date().toISOString(),
//         llmModel: props.llmModel,
//         llmConduct:props.llmConduct,
//         llmNeuro: props.llmNeuro
//       };
//       setMessages((prevMessages) => [...prevMessages, newMessage]);
//       setErrorResponse(false);
//     } else {
//       if (client?.npcText !== "" && !client?.isTalking) {
//         const newMessage = {
//           sender: client?.npcName ? client.npcName : client.characterId,
//           content: client?.npcText,
//           timestamp: new Date().toISOString(),
//           llmModel: props.llmModel,
//           llmConduct:props.llmConduct,
//           llmNeuro: props.llmNeuro
//         };
//         setMessages((prevMessages) => [...prevMessages, newMessage]);
        
//         // Increase interaction count when NPC replies
//         interactionCount += 1;
//         console.log("Current interactionCount:", interactionCount); 

//         clearTimeout(timer.current);
//         setErrorResponse(false);
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
//           onClick={() => {
//             ResetHistory();
//             interactionCount = 0; // Reset interaction count on session reset
//           }}
//         >
//           <img loading="lazy" src={reset} height="20vw" width="20vw" alt="reset chat" />
//           <p style={{ fontSize: "0.78vw", marginLeft: "7px", fontWeight: "bold" }}>Reset Session</p>
//         </div>
//       </div>
//       {chatHistory === "Show" && <ChatHistory history={history} messages={messages} showHistory={showHistory} />}
//       <ChatBubblev1 npcText={client?.npcText} userText={client?.userText} messages={messages} keyPressed={client?.keyPressed} />
//     </section>
//   );
// };

// export default ChatBubble;

