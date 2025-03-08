import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { KeyboardControls, Loader } from "@react-three/drei";
import { useConvaiClient } from "./hooks/useConvaiClient";
import ChatBubble from "./components/chat/Chat";
import { useState, useEffect } from "react";
import { uploadData } from "./helpers/datapipeAPI";

// Updated character arrays with practice characters (Anita and Sasha) added at the beginning
const CHARACTER_IDS = [
  // Practice characters
  "ea1c4d1e-6627-11ef-93da-42010a7be011", // Anita (replace with actual ID when available)
  "e9ac9844-6617-11ef-b5d4-42010a7be011", // Sasha (replace with actual ID when available)
  // Main study characters
  "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
  "a884e968-661a-11ef-93da-42010a7be011", // Ashline
  "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
  "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
];

const CHARACTER_LLM = ["LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1"];
const CHARACTER_CONDUCT = ["C", "C", "C", "C", "NC", "NC"];
const CHARACTER_NEURODIVERSITY = ["NT", "NT", "NT", "ND", "NT", "ND"];
const CHARACTER_MODELS = ["Jessie", "Amber", "Antoiane", "Ashline", "Charleen", "Jax"];

// Workflow stages
const STAGES = {
  INTRO: "intro",
  PRACTICE: "practice",
  PRACTICE_COMPLETE: "practiceComplete",
  MAIN_STUDY: "mainStudy"
};

/**
 * Retrieves the saved character index from localStorage safely.
 */
const getSavedIndex = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("currentIndex");
      return saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      console.error("Failed to read from localStorage:", error);
      return 0;
    }
  }
  return 0;
};

/**
 * Retrieves the saved workflow stage from localStorage safely.
 */
const getSavedStage = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("currentStage");
      return saved || STAGES.INTRO;
    } catch (error) {
      console.error("Failed to read stage from localStorage:", error);
      return STAGES.INTRO;
    }
  }
  return STAGES.INTRO;
};

function App() {
  const [currentIndex, setCurrentIndex] = useState(getSavedIndex);
  const [currentStage, setCurrentStage] = useState(getSavedStage);
  const [showWarning, setShowWarning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showInteractionCue, setShowInteractionCue] = useState(true);

  /**
   * Stores values in localStorage safely.
   */
  const safeSetLocalStorage = (key, value) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn("Failed to write to localStorage:", error);
      }
    }
  };

  /**
   * Converts messages array to CSV format with all required fields
   * @param {Array} messages - Array of message objects
   * @returns {String} CSV formatted string
   */
  const convertMessagesToCSV = (messages) => {
    const csvRows = ["timestamp,speaker,model,conduct,neurodiversity,content"]; // CSV Header without extra spaces and commas
    messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro }) => {
      csvRows.push(`"${timestamp}","${sender}","${llmModel}","${llmConduct}","${llmNeuro}","${content.replace(/"/g, '""')}"`);
    });
    return csvRows.join("\n");
  };

  /**
   * Resets the chat state when switching characters
   */
  const resetState = () => {
    setMessages([]);
    if (client?.convaiClient?.current) {
      client.convaiClient.current.resetSession();
    }
    client?.setUserText("");
    client?.setNpcText("");
    
    // Clear the character's chat history in localStorage
    const characterId = CHARACTER_IDS[currentIndex];
    try {
      const storedData = localStorage.getItem("messages");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData[characterId]) {
          parsedData[characterId] = {
            sessionID: -1,
            message: [],
          };
          localStorage.setItem("messages", JSON.stringify(parsedData));
        }
      }
    } catch (error) {
      console.error("Failed to reset localStorage:", error);
    }
    
    // Reset and show interaction cue when switching characters
    setShowInteractionCue(true);
  };

  /**
   * Generates a unique user ID for the questionnaire
   * @returns {String} Unique identifier
   */
  const generateUserID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  /**
   * Gets the current chat history from localStorage
   * @returns {Array} Array of message objects
   */
  const getStoredMessages = () => {
    try {
      const characterId = CHARACTER_IDS[currentIndex];
      const storedData = localStorage.getItem("messages");
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
          return parsedData[characterId].message;
        }
      }
    } catch (error) {
      console.error("Failed to get stored messages:", error);
    }
    return [];
  };

  /**
   * Handles starting the practice session
   */
  const handleStartPractice = () => {
    setCurrentStage(STAGES.PRACTICE);
    safeSetLocalStorage("currentStage", STAGES.PRACTICE);
    safeSetLocalStorage("currentIndex", 0); // Set to first practice character (Anita)
    setCurrentIndex(0);
  };

  /**
   * Handles starting the main study
   */
  const handleStartMainStudy = () => {
    setCurrentStage(STAGES.MAIN_STUDY);
    safeSetLocalStorage("currentStage", STAGES.MAIN_STUDY);
    safeSetLocalStorage("currentIndex", 2); // Set to first main study character (index 2, after practice characters)
    setCurrentIndex(2);
  };

  /**
   * Handles the Next/Questionnaire button action based on current stage
   */
  const handleNextOrQuestionnaire = async () => {
      // if locked, firsst get out to avoid the DOM error message
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Get latest messages from localStorage
    const currentMessages = getStoredMessages();
    
    // Check if user has had enough interactions (at least 5 messages from user)
    const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
    
    // For practice mode, just switch to next character
    if (currentStage === STAGES.PRACTICE) {
      if (userInteractions >= 5 || true) { // During practice, we could be more lenient with interaction count
        // If first practice character, move to second
        if (currentIndex === 0) {
          // Reset current character's chat history
          resetState();
          // Switch to second practice character
          safeSetLocalStorage("currentIndex", 1);
          setCurrentIndex(1);
        } 
        // If second practice character, move to practice complete stage
        else if (currentIndex === 1) {
          // Reset current character's chat history
          resetState();
          // Move to practice complete stage
          setCurrentStage(STAGES.PRACTICE_COMPLETE);
          safeSetLocalStorage("currentStage", STAGES.PRACTICE_COMPLETE);
        }
      } else {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
      }
      return;
    }
    
    // For main study, handle questionnaire
    if (currentStage === STAGES.MAIN_STUDY) {
      if (userInteractions >= 5) {
        try {
          // Generate a filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
          const filename = `chatHistory_${timestamp}.csv`;
          
          // Convert messages to CSV format
          const csvData = convertMessagesToCSV(currentMessages);
          
          // Upload CSV file
          const response = await uploadData(filename, csvData);
          if (response.ok) {
            console.log(`Chat history uploaded successfully as ${filename}`);
          } else {
            console.error("Failed to upload chat history:", response.statusText);
          }
          
          // Generate userID and construct Qualtrics URL
          const userID = generateUserID();
          const params = new URLSearchParams({
            userID,
            design_conduct: CHARACTER_CONDUCT[currentIndex],
            design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
          });
          
          // Reset current character's chat history
          resetState();
          
          // Switch to next character index (ensuring we stay within main study characters)
          const newIndex = (currentIndex + 1) % CHARACTER_IDS.length;
          // If we loop back to practice characters, reset to first main study character
          const finalIndex = newIndex < 2 ? 2 : newIndex;
          safeSetLocalStorage("currentIndex", finalIndex);
          setCurrentIndex(finalIndex);
          
          // Redirect to questionnaire
          window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_2hKNzkX1dhIgJIW?${params}`;
        } catch (error) {
          console.error("Error in questionnaire handling:", error);
        }
      } else {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
      }
    }
  };

  // Ensure correct character is loaded
  useEffect(() => {
    const savedIndex = getSavedIndex();
    const savedStage = getSavedStage();
    
    if (savedIndex !== currentIndex || savedStage !== currentStage) {
      setCurrentIndex(savedIndex);
      setCurrentStage(savedStage);
      resetState();
    }
  }, []);

  // Initialize Convai client with current character
  const { client } = useConvaiClient(
    CHARACTER_IDS[currentIndex],
    "00728a1475eba58eb62542c313d667f0"
  );

  /**
   * Handles new messages from the chat component
   * @param {Object} msg - The new message
   */
  const handleNewMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    
    // Hide interaction cue after first user message
    if (msg.sender === "user") {
      setShowInteractionCue(false);
    }
  };

  // Render different UI based on the current stage
  if (currentStage === STAGES.INTRO) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px", // 加倍
          padding: "40px", // 加倍
          width: "70%", // 增加宽度比例
          maxWidth: "1200px", // 加倍
          color: "white",
          textAlign: "center"
        }}>
          <h2 style={{ 
            marginBottom: "40px", // 加倍
            fontSize: "36px" // 添加更大的字体大小
          }}>Welcome to our web application!</h2>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>You can interact with several virtual citizens here and have fun!</p>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>First we will get into two practice trials for you to get easy with interacting with these virtual citizens.</p>
          
          <div 
            onClick={handleStartPractice}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px", // 加倍
              width: "200px", // 加倍
              height: "80px", // 加倍
              margin: "40px auto 0", // 加倍
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "24px" // 添加更大的字体大小
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            GO
          </div>
        </div>
      </div>
    );
  }
  
  if (currentStage === STAGES.PRACTICE_COMPLETE) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",    // doubled from 10px
          padding: "40px",         // doubled from 20px
          width: "100%",           // doubled from 50%
          maxWidth: "1400px",      // doubled from 600px
          color: "white",
          textAlign: "center",
          fontSize: "25px"
        }}>
          <h2 style={{ marginBottom: "40px" }}>Practice Complete!</h2> 
          <p>Now we are going to the main study, in this study, you will interact with 16 different virtual citizens.</p>
          <p>For each trial, you need to have at least 5 interactions with the current citizen.</p>
          <p>After each trial you will answer three questionnaires concerning your interaction experiences.</p>
          
          <div 
            onClick={handleStartMainStudy}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",    // doubled from 10px
              width: "200px",          // doubled from 100px
              height: "80px",          // doubled from 40px
              margin: "40px auto 0",   // doubled from 20px auto 0
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            GO
          </div>
        </div>
      </div>
    );
  }

  // For practice or main study stages, render the main app UI
  return (
    <>
      {/* Next/Questionnaire button */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "10px",
          width: "8vw",
          height: "2.5vw",
          color: "white",
          display: "flex",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
        onClick={handleNextOrQuestionnaire}
      >
        <div
          style={{
            alignSelf: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontWeight: "bold",
          }}
        >
          <p style={{ fontSize: "0.78vw" }}>
            {currentStage === STAGES.PRACTICE ? "Next" : "Questionnaire"}
          </p>
        </div>
      </div>

      {showInteractionCue && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "5px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "20px",
            width: "35vw",
            height: "25vh",            // ① 固定高度（也可用 minHeight: "300px"）
            color: "white",
            zIndex: 1000,
            display: "flex",           // ② 启用 Flexbox
            flexDirection: "column",
            justifyContent: "center",  // ③ 垂直居中
            alignItems: "center",      // ④ 水平居中
            padding: "5px"
          }}
        >
          {/* 上方文字区 */}
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.7vw", marginBottom: "5px" }}>Interaction Cue</p>
            <ol style={{ fontSize: "1.5vw", margin: "5px", textAlign: "left" }}>
              <li>Introduce yourself to this virtual citizen</li>
              <li>Greet them and ask their name</li>
              <li>Ask them what the situation</li>
              <li>Ask their feelings</li>
              <li>Ask them if they need help</li>
            </ol>
          </div>

          {/* 浮窗底部的额外区域 */}
          <div style={{ marginTop: "20px" }}>
            {/* 在这里放你想要的底部内容，比如说明文字或按钮 */}
            <p style={{ textAlign: "center" }}></p>
          </div>
        </div>
      )}


      {/* Warning message for insufficient interactions */}
      {showWarning && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(255,0,0,0.9)",
          color: "white",
          padding: "40px",          // doubled from 20px
          borderRadius: "16px",     // doubled from 8px
          zIndex: 9999,
          fontSize: "2em"           // added to double the text size
        }}>
          Minimum 5 interactions required!
        </div>
      )}

      <KeyboardControls
        map={[
          { name: "forward", keys: ["ArrowUp", "w", "W"] },
          { name: "backward", keys: ["ArrowDown", "s", "S"] },
          { name: "left", keys: ["ArrowLeft", "a", "A"] },
          { name: "right", keys: ["ArrowRight", "d", "D"] },
          { name: "sprint", keys: ["Shift"] },
          { name: "jump", keys: ["Space"] },
        ]}
      >
        <Loader />
        <Canvas
          shadows
          camera={{
            position: [0, 0.8, 3],
            fov: 75,
          }}
          key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
        >
          <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
        </Canvas>
      </KeyboardControls>
      <ChatBubble
        client={client}
        llmModel={CHARACTER_LLM[currentIndex]}
        llmConduct={CHARACTER_CONDUCT[currentIndex]}
        llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
        onNewMessage={handleNewMessage}
        // chatHistory="Show"
      />
    </>
  );
}

export default App;

// import { Canvas } from "@react-three/fiber";
// import { Experience } from "./components/Experience";
// import { KeyboardControls, Loader } from "@react-three/drei";
// import { useConvaiClient } from "./hooks/useConvaiClient";
// import ChatBubble from "./components/chat/Chat";
// import { useState, useEffect } from "react";
// import { uploadData } from "./helpers/datapipeAPI";

// const CHARACTER_IDS = [
//   "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
//   "a884e968-661a-11ef-93da-42010a7be011", // Ashline
//   "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
//   "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
// ];

// const CHARACTER_LLM = ["LLM1", "LLM1", "LLM1", "LLM1"];
// const CHARACTER_CONDUCT = ["C", "C", "NC", "NC"];
// const CHARACTER_NEURODIVERSITY = ["NT", "ND", "NT", "ND"];
// const CHARACTER_MODELS = ["Antoiane", "Ashline", "Charleen", "Jax"];

// /**
//  * Retrieves the saved character index from localStorage safely.
//  */
// const getSavedIndex = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("currentIndex");
//       return saved ? parseInt(saved, 10) : 0;
//     } catch (error) {
//       console.error("Failed to read from localStorage:", error);
//       return 0;
//     }
//   }
//   return 0;
// };

// function App() {
//   const [currentIndex, setCurrentIndex] = useState(getSavedIndex);
//   const [showWarning, setShowWarning] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [showInteractionCue, setShowInteractionCue] = useState(true);

//   /**
//    * Stores the character index in localStorage safely.
//    */
//   const safeSetLocalStorage = (key, value) => {
//     if (typeof window !== "undefined") {
//       try {
//         localStorage.setItem(key, value);
//       } catch (error) {
//         console.warn("Failed to write to localStorage:", error);
//       }
//     }
//   };

//   /**
//  * Converts messages array to CSV format with all required fields
//  * @param {Array} messages - Array of message objects
//  * @returns {String} CSV formatted string
//  */
// const convertMessagesToCSV = (messages) => {
//   const csvRows = ["timestamp,speaker,model,conduct,neurodiversity,content"]; // CSV Header without extra spaces and commas
//   messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro }) => {
//     csvRows.push(`"${timestamp}","${sender}","${llmModel}","${llmConduct}","${llmNeuro}","${content.replace(/"/g, '""')}"`);
//   });
//   return csvRows.join("\n");
// };

//   /**
//    * Resets the chat state when switching characters
//    */
//   const resetState = () => {
//     setMessages([]);
//     if (client?.convaiClient?.current) {
//       client.convaiClient.current.resetSession();
//     }
//     client?.setUserText("");
//     client?.setNpcText("");
    
//     // Clear the character's chat history in localStorage
//     const characterId = CHARACTER_IDS[currentIndex];
//     try {
//       const storedData = localStorage.getItem("messages");
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId]) {
//           parsedData[characterId] = {
//             sessionID: -1,
//             message: [],
//           };
//           localStorage.setItem("messages", JSON.stringify(parsedData));
//         }
//       }
//     } catch (error) {
//       console.error("Failed to reset localStorage:", error);
//     }
    
//     // Reset and show interaction cue when switching characters
//     setShowInteractionCue(true);
//   };

//   /**
//    * Generates a unique user ID for the questionnaire
//    * @returns {String} Unique identifier
//    */
//   const generateUserID = () => {
//     return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
//   };

//   /**
//    * Gets the current chat history from localStorage
//    * @returns {Array} Array of message objects
//    */
//   const getStoredMessages = () => {
//     try {
//       const characterId = CHARACTER_IDS[currentIndex];
//       const storedData = localStorage.getItem("messages");
      
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
//           return parsedData[characterId].message;
//         }
//       }
//     } catch (error) {
//       console.error("Failed to get stored messages:", error);
//     }
//     return [];
//   };

//   /**
//    * Handles the questionnaire button click
//    * Uploads chat history as CSV, then redirects to questionnaire
//    */
//   const handleQuestionnaire = async () => {
//     // Get latest messages from localStorage
//     const currentMessages = getStoredMessages();
    
//     // Check if user has had enough interactions (at least 5 messages from user)
//     const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
    
//     if (userInteractions >= 5) {
//       try {
//         // Generate a filename with timestamp
//         const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
//         const filename = `chatHistory_${timestamp}.csv`;
        
//         // Convert messages to CSV format
//         const csvData = convertMessagesToCSV(currentMessages);
        
//         // Upload CSV file
//         const response = await uploadData(filename, csvData);
//         if (response.ok) {
//           console.log(`Chat history uploaded successfully as ${filename}`);
//         } else {
//           console.error("Failed to upload chat history:", response.statusText);
//         }
        
//         // Generate userID and construct Qualtrics URL
//         const userID = generateUserID();
//         const params = new URLSearchParams({
//           userID,
//           design_conduct: CHARACTER_CONDUCT[currentIndex],
//           design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
//         });
        
//         // Reset current character's chat history
//         resetState();
        
//         // Switch to next character index
//         const newIndex = (currentIndex + 1) % CHARACTER_IDS.length;
//         safeSetLocalStorage("currentIndex", newIndex);
        
//         // Redirect to questionnaire
//         window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_2hKNzkX1dhIgJIW?${params}`;
//       } catch (error) {
//         console.error("Error in questionnaire handling:", error);
//       }
//     } else {
//       setShowWarning(true);
//       setTimeout(() => setShowWarning(false), 2000);
//     }
//   };

//   // Ensure correct character is loaded
//   useEffect(() => {
//     const savedIndex = getSavedIndex();
//     if (savedIndex !== currentIndex) {
//       setCurrentIndex(savedIndex);
//       resetState();
//     }
//   }, []);

//   // Initialize Convai client with current character
//   const { client } = useConvaiClient(
//     CHARACTER_IDS[currentIndex],
//     "00728a1475eba58eb62542c313d667f0"
//   );

//   /**
//    * Handles new messages from the chat component
//    * @param {Object} msg - The new message
//    */
//   const handleNewMessage = (msg) => {
//     setMessages(prev => [...prev, msg]);
    
//     // Hide interaction cue after first user message
//     if (msg.sender === "user") {
//       setShowInteractionCue(false);
//     }
//   };

//   return (
//     <>
//       {/* Questionnaire button */}
//       <div
//         style={{
//           position: "absolute",
//           top: "10px",
//           right: "10px",
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "10px",
//           width: "8vw",
//           height: "2.5vw",
//           color: "white",
//           display: "flex",
//           justifyContent: "center",
//           cursor: "pointer",
//           zIndex: 1000,
//         }}
//         onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
//         onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
//         onClick={handleQuestionnaire}
//       >
//         <div
//           style={{
//             alignSelf: "center",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             fontWeight: "bold",
//           }}
//         >
//           <p style={{ fontSize: "0.78vw" }}>Questionnaire</p>
//         </div>
//       </div>

//       {/* Interaction Cue in left upper corner */}
//       {showInteractionCue && (
//         <div
//           style={{
//             position: "absolute",
//             top: "10px",
//             left: "10px",
//             backgroundColor: "rgba(0, 0, 0, 0.7)",
//             borderRadius: "10px",
//             width: "20vw",
//             padding: "10px",
//             color: "white",
//             zIndex: 1000,
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               fontWeight: "bold",
//             }}
//           >
//             <p style={{ fontSize: "0.9vw", textAlign: "center", marginBottom: "5px" }}>Interaction Cue</p>
//             <ol style={{ fontSize: "0.78vw", paddingLeft: "20px", margin: "0" }}>
//               <li>Introduce yourself to this virtual citizen</li>
//               <li>Greet them and ask their name</li>
//               <li>Ask them what the situation</li>
//               <li>Ask their feelings</li>
//               <li>Ask them if they need help</li>
//             </ol>
//           </div>
//         </div>
//       )}

//       {/* Warning message for insufficient interactions */}
//       {showWarning && (
//         <div style={{
//           position: "fixed",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           backgroundColor: "rgba(255,0,0,0.9)",
//           color: "white",
//           padding: "20px",
//           borderRadius: "8px",
//           zIndex: 9999
//         }}>
//           Minimum 5 interactions required!
//         </div>
//       )}

//       <KeyboardControls
//         map={[
//           { name: "forward", keys: ["ArrowUp", "w", "W"] },
//           { name: "backward", keys: ["ArrowDown", "s", "S"] },
//           { name: "left", keys: ["ArrowLeft", "a", "A"] },
//           { name: "right", keys: ["ArrowRight", "d", "D"] },
//           { name: "sprint", keys: ["Shift"] },
//           { name: "jump", keys: ["Space"] },
//         ]}
//       >
//         <Loader />
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//           key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
//         >
//           <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
//         </Canvas>
//       </KeyboardControls>
//       <ChatBubble
//         client={client}
//         llmModel={CHARACTER_LLM[currentIndex]}
//         llmConduct={CHARACTER_CONDUCT[currentIndex]}
//         llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
//         onNewMessage={handleNewMessage}
//         // chatHistory="Show"
//       />
//     </>
//   );
// }

// export default App;


// import { Canvas } from "@react-three/fiber";
// import { Experience } from "./components/Experience";
// import { KeyboardControls, Loader } from "@react-three/drei";
// import { useConvaiClient } from "./hooks/useConvaiClient";
// import ChatBubble from "./components/chat/Chat";
// import { useState, useEffect } from "react";
// import { uploadData } from "./helpers/datapipeAPI";

// const CHARACTER_IDS = [
//   "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
//   "a884e968-661a-11ef-93da-42010a7be011", // Ashline
//   "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
//   "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
// ];

// const CHARACTER_LLM = ["LLM1", "LLM1", "LLM1", "LLM1"];
// const CHARACTER_CONDUCT = ["C", "C", "NC", "NC"];
// const CHARACTER_NEURODIVERSITY = ["NT", "ND", "NT", "ND"];
// const CHARACTER_MODELS = ["Antoiane", "Ashline", "Charleen", "Jax"];

// /**
//  * Retrieves the saved character index from localStorage safely.
//  */
// const getSavedIndex = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("currentIndex");
//       return saved ? parseInt(saved, 10) : 0;
//     } catch (error) {
//       console.error("Failed to read from localStorage:", error);
//       return 0;
//     }
//   }
//   return 0;
// };

// function App() {
//   const [currentIndex, setCurrentIndex] = useState(getSavedIndex);
//   const [showWarning, setShowWarning] = useState(false);
//   const [messages, setMessages] = useState([]);

//   /**
//    * Stores the character index in localStorage safely.
//    */
//   const safeSetLocalStorage = (key, value) => {
//     if (typeof window !== "undefined") {
//       try {
//         localStorage.setItem(key, value);
//       } catch (error) {
//         console.warn("Failed to write to localStorage:", error);
//       }
//     }
//   };

//   /**
//  * Converts messages array to CSV format with all required fields
//  * @param {Array} messages - Array of message objects
//  * @returns {String} CSV formatted string
//  */
// const convertMessagesToCSV = (messages) => {
//   const csvRows = ["timestamp,speaker,model,conduct,neurodiversity,content"]; // CSV Header without extra spaces and commas
//   messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro }) => {
//     csvRows.push(`"${timestamp}","${sender}","${llmModel}","${llmConduct}","${llmNeuro}","${content.replace(/"/g, '""')}"`);
//   });
//   return csvRows.join("\n");
// };

//   /**
//    * Resets the chat state when switching characters
//    */
//   const resetState = () => {
//     setMessages([]);
//     if (client?.convaiClient?.current) {
//       client.convaiClient.current.resetSession();
//     }
//     client?.setUserText("");
//     client?.setNpcText("");
    
//     // Clear the character's chat history in localStorage
//     const characterId = CHARACTER_IDS[currentIndex];
//     try {
//       const storedData = localStorage.getItem("messages");
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId]) {
//           parsedData[characterId] = {
//             sessionID: -1,
//             message: [],
//           };
//           localStorage.setItem("messages", JSON.stringify(parsedData));
//         }
//       }
//     } catch (error) {
//       console.error("Failed to reset localStorage:", error);
//     }
//   };

//   /**
//    * Generates a unique user ID for the questionnaire
//    * @returns {String} Unique identifier
//    */
//   const generateUserID = () => {
//     return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
//   };

//   /**
//    * Gets the current chat history from localStorage
//    * @returns {Array} Array of message objects
//    */
//   const getStoredMessages = () => {
//     try {
//       const characterId = CHARACTER_IDS[currentIndex];
//       const storedData = localStorage.getItem("messages");
      
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
//           return parsedData[characterId].message;
//         }
//       }
//     } catch (error) {
//       console.error("Failed to get stored messages:", error);
//     }
//     return [];
//   };

//   /**
//    * Handles the questionnaire button click
//    * Uploads chat history as CSV, then redirects to questionnaire
//    */
//   const handleQuestionnaire = async () => {
//     // Get latest messages from localStorage
//     const currentMessages = getStoredMessages();
    
//     // Check if user has had enough interactions (at least 5 messages from user)
//     const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
    
//     if (userInteractions >= 5) {
//       try {
//         // Generate a filename with timestamp
//         const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
//         const filename = `chatHistory_${timestamp}.csv`;
        
//         // Convert messages to CSV format
//         const csvData = convertMessagesToCSV(currentMessages);
        
//         // Upload CSV file
//         const response = await uploadData(filename, csvData);
//         if (response.ok) {
//           console.log(`Chat history uploaded successfully as ${filename}`);
//         } else {
//           console.error("Failed to upload chat history:", response.statusText);
//         }
        
//         // Generate userID and construct Qualtrics URL
//         const userID = generateUserID();
//         const params = new URLSearchParams({
//           userID,
//           design_conduct: CHARACTER_CONDUCT[currentIndex],
//           design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
//         });
        
//         // Reset current character's chat history
//         resetState();
        
//         // Switch to next character index
//         const newIndex = (currentIndex + 1) % CHARACTER_IDS.length;
//         safeSetLocalStorage("currentIndex", newIndex);
        
//         // Redirect to questionnaire
//         window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_2hKNzkX1dhIgJIW?${params}`;
//       } catch (error) {
//         console.error("Error in questionnaire handling:", error);
//       }
//     } else {
//       setShowWarning(true);
//       setTimeout(() => setShowWarning(false), 2000);
//     }
//   };

//   // Ensure correct character is loaded
//   useEffect(() => {
//     const savedIndex = getSavedIndex();
//     if (savedIndex !== currentIndex) {
//       setCurrentIndex(savedIndex);
//       resetState();
//     }
//   }, []);

//   // Initialize Convai client with current character
//   const { client } = useConvaiClient(
//     CHARACTER_IDS[currentIndex],
//     "00728a1475eba58eb62542c313d667f0"
//   );

//   /**
//    * Handles new messages from the chat component
//    * @param {Object} msg - The new message
//    */
//   const handleNewMessage = (msg) => {
//     setMessages(prev => [...prev, msg]);
//   };

//   return (
//     <>
//       {/* Questionnaire button styled as in the second version */}
//       <div
//         style={{
//           position: "absolute",
//           top: "10px",
//           right: "10px",
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "10px",
//           width: "8vw",
//           height: "2.5vw",
//           color: "white",
//           display: "flex",
//           justifyContent: "center",
//           cursor: "pointer",
//           zIndex: 1000,
//         }}
//         onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
//         onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
//         onClick={handleQuestionnaire}
//       >
//         <div
//           style={{
//             alignSelf: "center",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             fontWeight: "bold",
//           }}
//         >
//           <p style={{ fontSize: "0.78vw" }}>Questionnaire</p>
//         </div>
//       </div>

//       {/* Warning message for insufficient interactions */}
//       {showWarning && (
//         <div style={{
//           position: "fixed",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           backgroundColor: "rgba(255,0,0,0.9)",
//           color: "white",
//           padding: "20px",
//           borderRadius: "8px",
//           zIndex: 9999
//         }}>
//           Minimum 5 interactions required!
//         </div>
//       )}

//       <KeyboardControls
//         map={[
//           { name: "forward", keys: ["ArrowUp", "w", "W"] },
//           { name: "backward", keys: ["ArrowDown", "s", "S"] },
//           { name: "left", keys: ["ArrowLeft", "a", "A"] },
//           { name: "right", keys: ["ArrowRight", "d", "D"] },
//           { name: "sprint", keys: ["Shift"] },
//           { name: "jump", keys: ["Space"] },
//         ]}
//       >
//         <Loader />
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//           key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
//         >
//           <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
//         </Canvas>
//       </KeyboardControls>
//       <ChatBubble
//         client={client}
//         llmModel={CHARACTER_LLM[currentIndex]}
//         llmConduct={CHARACTER_CONDUCT[currentIndex]}
//         llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
//         onNewMessage={handleNewMessage}
//         // chatHistory="Show"
//       />
//     </>
//   );
// }

// export default App;

// import { Canvas } from "@react-three/fiber";
// import { Experience } from "./components/Experience";
// import { KeyboardControls, Loader } from "@react-three/drei";
// import { useConvaiClient } from "./hooks/useConvaiClient";
// import ChatBubble from "./components/chat/Chat";
// import { useState, useEffect } from "react";

// const CHARACTER_IDS = [
//   "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
//   "a884e968-661a-11ef-93da-42010a7be011", // Ashline
//   "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
//   "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
// ];
// //The sequence for inputting CHARACTER_LLM should corresponds to the sequence of CHARACTER_ID.
// //This could be imporved by the scaling the index so that we won't have to input repetitive information, in the latter non-DEMO version.
// const CHARACTER_LLM = [
//   "LLM1",
//   "LLM1",
//   "LLM1",
//   "LLM1",
//   // add LLM2, LLM3, LLM4 if matched characterID is imported above.
// ];

// const CHARACTER_CONDUCT = [
//   "C",
//   "C",
//   "NC",
//   "NC",
//   // add LLM2, LLM3, LLM4 if matched characterID is imported above.
// ];

// const CHARACTER_NEURODIVERSITY = [
//   "NT",
//   "ND",
//   "NT",
//   "ND",
//   // add LLM2, LLM3, LLM4 if matched characterID is imported above.
// ];



// const CHARACTER_MODELS = [
//   "Antoiane", // Antoiane
//   "Ashline", // Ashline
//   "Charleen", // Charleen
//   "Jax", // Jax
// ];

// /**
//  * Retrieves the saved character index from localStorage safely.
//  */
// const getSavedIndex = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("currentIndex");
//       return saved ? parseInt(saved, 10) : 0;
//     } catch (error) {
//       console.error("Failed to read from localStorage:", error);
//       return 0;
//     }
//   }
//   return 0;
// };

// function App() {
//   const [currentIndex, setCurrentIndex] = useState(getSavedIndex);

//   /**
//    * Stores the character index in localStorage safely.
//    */
//   const safeSetLocalStorage = (key, value) => {
//     if (typeof window !== "undefined") {
//       try {
//         localStorage.setItem(key, value);
//       } catch (error) {
//         console.warn("Failed to write to localStorage:", error);
//       }
//     }
//   };

//   /**
//    * Handles character switching and immediately navigates to the survey.
//    */
//   // const switchCharacter = () => {
//   //   const newIndex = (currentIndex + 1) % CHARACTER_IDS.length;
//   //   safeSetLocalStorage("currentIndex", newIndex); // Ensure the new character is saved
//   //   window.location.href =
//   //     "https://uwmadison.co1.qualtrics.com/jfe/form/SV_37PASiKtDyMEFBs";
//   // };
//   // Function to generate a unique userID using current timestamp and a random string
//   const generateUserID = () => {
//     // Convert the current timestamp to base36 and append a random string
//     return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
//   };

//   const switchCharacter = () => {
//     // Calculate the new character index and save it to localStorage
//     const newIndex = (currentIndex + 1) % CHARACTER_IDS.length;
//     safeSetLocalStorage("currentIndex", newIndex);
  
//     // Generate a unique userID
//     const userID = generateUserID();
    
//     // Retrieve the corresponding values from arrays
//     const design_conduct = CHARACTER_CONDUCT[currentIndex];
//     const design_neurodiversity = CHARACTER_NEURODIVERSITY[currentIndex];
  
//     // Qualtrics questionnaire URL
//     const qualtricsUrl = "https://uwmadison.co1.qualtrics.com/jfe/form/SV_2hKNzkX1dhIgJIW";
  
//     // Construct the URL by appending multiple query parameters
//     const fullUrl = `${qualtricsUrl}?userID=${encodeURIComponent(userID)}&design_conduct=${encodeURIComponent(design_conduct)}&design_neurodiversity=${encodeURIComponent(design_neurodiversity)}`;
  
//     // Redirect to the constructed URL
//     window.location.href = fullUrl;
//   };
  

  

//   /**
//    * Ensures the correct character is loaded after returning from the survey.
//    */
//   useEffect(() => {
//     setCurrentIndex(getSavedIndex());
//   }, []);

//   const { client } = useConvaiClient(
//     CHARACTER_IDS[currentIndex],
//     "00728a1475eba58eb62542c313d667f0"
//   );

//   return (
//     <>
//       {/* Next button */}
//       <div
//         style={{
//           position: "absolute",
//           top: "10px",
//           right: "10px",
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "10px",
//           width: "8vw",
//           height: "2.5vw",
//           color: "white",
//           display: "flex",
//           justifyContent: "center",
//           cursor: "pointer",
//           zIndex: 1000,
//         }}
//         onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
//         onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
//         onClick={switchCharacter}
//       >
//         <div
//           style={{
//             alignSelf: "center",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             fontWeight: "bold",
//           }}
//         >
//           <p style={{ fontSize: "0.78vw" }}>Questionnaire</p>
//         </div>
//       </div>

//       <KeyboardControls
//         map={[
//           { name: "forward", keys: ["ArrowUp", "w", "W"] },
//           { name: "backward", keys: ["ArrowDown", "s", "S"] },
//           { name: "left", keys: ["ArrowLeft", "a", "A"] },
//           { name: "right", keys: ["ArrowRight", "d", "D"] },
//           { name: "sprint", keys: ["Shift"] },
//           { name: "jump", keys: ["Space"] },
//         ]}
//       >
//         <Loader />
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//         >
//           <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
//         </Canvas>
//       </KeyboardControls>
//       <ChatBubble
//         client={client}
//         llmModel={CHARACTER_LLM[currentIndex]}
//         llmConduct={CHARACTER_CONDUCT[currentIndex]}
//         llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
//       />
//     </>
//   );
// }

// export default App;

