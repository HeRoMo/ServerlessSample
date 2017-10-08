'use strict';

import Github from 'github-api';

export const hello = async (event, context, callback) => {
  if(event.Records && event.Records.length > 0 ){
    console.log(JSON.stringify(event))
    const message = JSON.parse(event.Records[0].Sns.Message)
    console.log(JSON.stringify(message))

    const gh = new Github({
      token: process.env.GITHUB_TOKEN
    });
    const repo = gh.getRepo('HeRoMo','Test')
    const opts = {
      state: 'pending'
    }
    const commitSHA = message.pull_request.head.sha
    repo.updateStatus(commitSHA, opts).then(function(data){
      console.log(data)
    })
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `Go Serverless v1.0! ${(await message({ time: 1, copy: 'Your function executed successfully!'}))}`,
      input: event,
    }),
  };

  callback(null, response);
};

const message = ({ time, ...rest }) => new Promise((resolve, reject) =>
  setTimeout(() => {
    resolve(`${rest.copy} (with a delay)`);
  }, time * 1000)
);
