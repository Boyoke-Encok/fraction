import axios from "axios";

const baseHeader = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
  Referer: "https://dapp.fractionai.xyz/",
  Origin: "https://dapp.fractionai.xyz",
  "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const JoinSpace = async (bearer, id) => {
  const getAiagent = await axios.get(`https://dapp-backend-large.fractionai.xyz/api3/agents/user/${id}`, {
    headers: { ...baseHeader, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
  });
  const aiagent = getAiagent.data;
  const aiagentId = [];
  const nameAgent = [];
  for (let i = 0; i < aiagent.length; i++) {
    aiagentId.push(aiagent[i].id);
    nameAgent.push(aiagent[i].name);
  }

  const detail = {
    aiagentId: aiagentId,
    nameAgent: nameAgent,
  };

  return detail;
};

export default JoinSpace;
