import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
const bedrock = new BedrockRuntimeClient();
const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

export const handler = async (state) => {
  try {
    let campaignRule = '';
    if (state.post.campaign) {
      const lastCampaignDate = getLatestCampaignDate(state.post.campaign, state.schedule);
      if (lastCampaignDate) {
        campaignRule = `- The date must be at least 5 days after ${lastCampaignDate}`;
      }
    }
    const schedule = state.schedule.map(s => `\t- ${s.sort}, Platform: ${s.type}`);
    const promptSchedule = schedule.length ? schedule.join('\r\n') : 'No schedule';

    const rules = `- The post must be at least one day after ${state.timestamp}
      - Do not schedule a post on the weekend.
      - Only one post is allowed to be scheduled a day per platform
      - Select the next available day in the future that matches the above rules unless otherwise specified
      - The scheduled time of day must vary between high engagement times in the morning and afternoon for the target audience.
      - Make sure the year is correct. If scheduling into January from December, make sure to increment the year.
      ${campaignRule}`;

    const prompt = getPrompt(rules, promptSchedule);

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        max_tokens: 100000,
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            role: "user",
            content: [{
              type: "text",
              text: prompt
            }]
          }
        ]
      })
    }));

    const answer = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = answer.content[0].text;

    const match = aiResponse.match(/<date_time>(.*?)<\/date_time>/)[1];
    if (match) {
      return { date: match };
    } else {
      console.warn(completion);
      throw new AIError('Did not receive expected response');
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getLatestCampaignDate = (campaign, schedule) => {
  const filteredPosts = schedule?.filter(post => post.campaign?.toLowerCase() === campaign.toLowerCase());

  if (filteredPosts?.length) {
    const latestPost = filteredPosts?.reduce((latest, current) => {
      return new Date(current.sort) > new Date(latest.sort) ? current : latest;
    });

    return latestPost?.sort;
  }
};

const getPrompt = (rules, schedule) => {
  const prompt = `You are an AI scheduling assistant that helps determine the optimal date and time to send out social media posts. To do this, you will be provided with a set of scheduling rules to follow and an existing schedule of social media posts. Your task is to analyze this information and select the best date and time for the next social media post.

Here are the scheduling rules you must adhere to:
<rules>
${rules}
</rules>

Here is the current scheduled dates of social media posts:
<schedule>
${schedule}
</schedule>

First, carefully review the provided rules and schedule. Think through potential date and time options, taking into account all constraints. Write out your thought process in a <scratchpad> section.

After considering all factors, select the optimal date and time for the next social media post that follows all the rules and fits well into the existing schedule. Provide your selected date and time in YYYY-MM-DDTHH:MM:SS format inside <date_time> tags.`;

  return prompt;
};

class AIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidAIResponse';
  }
};
