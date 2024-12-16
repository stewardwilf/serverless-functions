# Serverless Functions

This repository contains AWS Lambda functions managed and deployed via the [Serverless Framework](https://www.serverless.com/). The instructions below will guide you through configuration, deployment, and testing.

## Prerequisites

1. **AWS Account**:  
   Ensure you have an AWS account with an IAM user that has permissions to manage Lambda, API Gateway, S3, Textraction and Parameter Store (Systems Manager).

2. **AWS CLI**:  
   Install the AWS Command Line Interface by following the [official AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

3. **Node.js & npm**:  
   Make sure Node.js and npm are installed:
   ```bash
   node -v
   npm -v

## Setup

1. **Configure AWS Credentials**:
    Run:
    `aws configure`

2. **Install dependencies**:
    Run:
    `npm install`

3. **Create Required Parameters in AWS**:
    Open the AWS Systems Manager Parameter Store and create the parameters referenced in serverless.yml. Make sure the names and values match exactly what the configuration expects.

4. **Deployment**:
    To deploy functions and other required infra, run:
    `serverless deploy`

    This will:

    Package and deploy the Lambda functions.
    Set up API Gateway endpoints.
    Create S3 bucket.
    Create and assign required IAM roles.
    Integrate with any other AWS services as defined in serverless.yml.

## Post-Deployment Verification
**Check deployments in AWS Lambda, AWS S3, API Gateway**:
    Visit the Lambda console, S3 console & API Gateway console to confirm that the resources were created successfully.
    Invoke the Function:
    Replace <ENDPOINT> with the details from your deployment.
    Replace <YOUR_BASE64_STRING>, <YOUR_IMAGE_NAME> and <YOUR_NATIONALITY> with details of image, nationality etc. use 'UK' for UK passport.

    curl -X POST \
    "<ENDPOINT>/dev/upload?filename=<YOUR_IMAGE_NAME>" \
    -H "Content-Type: application/json" \
    -d '{
        "imageBase64": "<YOUR_BASE64_STRING>",
        "nationality": "<YOUR_NATIONALITY>"
    }'


## Troubleshooting

**Credentials/Permissions Issues**:
    Double-check your AWS CLI credentials and IAM permissions.

**Missing Parameters**:
    Ensure that all parameters mentioned in serverless.yml are created and properly named in the Parameter Store.

**Deployment Failures**:
    Use the --verbose flag:
    `serverless deploy --verbose`

Check AWS CloudFormation stacks in the CloudFormation console for error messages if deployment fails.

## Cleanup
**If you need to remove the deployed functions and resources**:
    `serverless remove`
    This will delete the CloudFormation stack and associated AWS resources created by serverless deploy.


## Rationale
**This section explains some code changes that I would make given further time**:

**Future code/ repo improvements**:
* Move param creation into infrastructure as code
* Implement some user based logic - currently all images are just stored. This solution should receieve userId and store image in a folder, or store in metadata of image
* Implement a dupe image upload check - currently the uploadImage lambda receieves as request to write and attempts to execute it. We should have some understanding if this user already uploaded an image
* Extract DB client implementation from within the lambda to reuseable file
* Refactor serverless.yaml into multiple serverless files as this directory grew, to control maintainability
* Improved test coverage
* Add easier local deployment and testing functionality using serverless offline/ SAM
* convert type to module
* convert helpers.js to typescript