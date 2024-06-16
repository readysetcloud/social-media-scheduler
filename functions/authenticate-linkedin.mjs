import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { jsonResponse } from "./utils/helpers.mjs";

export const handler = async (event) => {
  try {

  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
