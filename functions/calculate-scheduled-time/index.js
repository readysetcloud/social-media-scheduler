const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const bedrock = new BedrockRuntimeClient();

exports.handler = async (state) => {
  try {
    let campaignRule = '';
    if (state.post.campaign) {
      const lastCampaignDate = getLatestCampaignDate(state.post.campaign, state.schedule);
      if (lastCampaignDate) {
        campaignRule = `- The date must be at least 5 days after ${lastCampaignDate}`;
      }
    }
    const schedule = state.schedule.map(s => `\t- ${s.sort}`);
    const promptSchedule = schedule.length ? schedule.join('\r\n') : 'No schedule';

    const prompt = `Human: You are a master calender planner. I want to schedule a social post. I need you to give me a time in UTC in the format of YYYY-MM-DDTHH:MM:SS. My audience is mostly in the USA, some in europe and is highly technical. Return ONLY the schedule date and nothing else.
    Rules:
      - The post must be at least one day after ${state.timestamp}
      - Do not schedule a post on the weekend.
      - Only one post is allowed to be scheduled a day
      - Select the next available day in the future that matches the above rules unless otherwise specified
      - The scheduled time of day must vary between high engagement times in the morning and afternoon for the target audience.
      - Make sure the year is correct. If scheduling into January from December, make sure to increment the year.
      ${campaignRule}
    Schedule:
    ${promptSchedule}
    Assistant: `;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-v2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt,
        temperature: 0.5,
        max_tokens_to_sample: 2500,
        anthropic_version: "bedrock-2023-05-31"
      })
    }));

    const answer = JSON.parse(new TextDecoder().decode(response.body));
    const completion = answer.completion;

    const match = completion.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (match) {
      return { date: match[0] };
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

class AIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidAIResponse';
  }
};
