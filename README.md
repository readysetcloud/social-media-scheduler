## Social Post Scheduler

This service will schedule your social posts asynchronously. The schedules run on a variable delay timer to simulate human activity. Currently the only social network supported is X/Twitter.

### Deploy

To deploy this to your AWS account, you will need the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

You will need to follow the Twitter developer setup page to create a [Twitter developer account](https://developer.twitter.com/en) and create all the necessary keys for posting into your account.

The keys required are your `API Key`, `API Key Secret`, `Bearer Token`, `Access Token`, and `Access Token Secret`. Be sure to create your Access Token Secret with read and write permissions (will require you to setup OAuth 1.0).

After you have your Twitter credentials and SAM CLI installed, you can deploy into your account with the following commands:

```bash
sam build
sam deploy --guided
```

This will walk you through a wizard and prompt you for your Twitter credentials, which will be stored in AWS Secrets Manager.

### How it works

Scheduling a social post is driven off an event-driven architecture. When the triggering event is recieved, a Step Function workflow is run to create a one-time EventBridge schedule. If the schedule already exists for the provided post, it is updated with the new information.

Below is an example EventBridge payload to trigger scheduling a post:

```json
{
  "detail-type": "Schedule Social Post",
  "source": "test",
  "detail": {
    "message": "Hello world!",
    "platform": "twitter",
    "scheduledDate": "2023-10-23T08:48:00",
    "referenceNumber": "testtweet"
  }
}
```

* **message** - This is the contents of the message you wish to send. It must be within the standard 280 characters for a tweet (unless you are a premium member)
* **platform** - Social media platform to send on. Currently only supports `twitter` (case-sensitive)
* **scheduledDate** - Date and time in UTC you wish to send the message. There will be up to an 8 minute delay on the sending of the message.
* **referenceNumber** - *Optional* - This is the unique identifier of your social post. This is used on the consumer end for tracking purposes.

When a post is successfully scheduled, an EventBridge event will be sent in your AWS account with the following payload:

```json
{
  "detail-type": "Post Scheduled",
  "source": "SocialPostScheduler",
  "detail": {
    "referenceNumber": "testtweet",
    "scheduledDate": "2023-10-23T08:48:00"
  }
}
```

You can use this to confirm successful scheduling. If you did not include a reference number, a generated one will be used.

### Sending the post

After a post is scheduled, the EventBridge schedule will trigger at the time you configured. By default, it is set to an 8 minute flexible time window which you can change by updating the source code.

#### Successful posting

If your message was successfully posted, you will receive an EventBridge event with the following payload:

```json
{
  "detail-type": "Social Post Sent",
  "source": "SocialPostSender",
  "detail": {
    "referenceNumber": "testtweet",
    "postId": "1716462083489812952"
  }
}
```

The postId is the identifier of the tweet that was sent. To compose it as part of a url, you can use:

> https://twitter.com/{account name}/status/{postId}

#### Failed posting

In the event your post was not successful, you will receive an EventBridge event with the following payload:

```json
{
  "detail-type": "Social Post Failed",
  "source": "SocialPostSender",
  "detail": {
    "referenceNumber": "testtweet"
  }
}
```

If the EventBridge scheduler failed to run, a message will be added to a Dead Letter Queue in your account. This DLQ has a CloudWatch alarm associated with it if items in the queue are older than 1 hour.

### Future plans

Below is a list of features that will be coming to the scheduler

* Automatic best time scheduling broken down by campaign
* LinkedIn support
