// Jenkins Pipeline for E2E Automation Framework
// Requires: Credentials configured in Jenkins for:
//   - 'salesforce-jwt-credentials' (username/password or secret text)
//   - 'atlassian-api-token' (secret text)

pipeline {
    agent {
        docker {
            image 'node:20-slim'
            args '''
                -v /var/run/docker.sock:/var/run/docker.sock
                --shm-size=2gb
            '''
        }
    }
    
    options {
        timeout(time: 90, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }
    
    environment {
        NODE_VERSION = '20'
        ENV = 'qa'
        HEADLESS = 'true'
        CI = 'true'
        TAKE_SCREENSHOTS = 'true'
        CAPTURE_EVIDENCE = 'true'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh '''
                    apt-get update && apt-get install -y \
                        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
                        libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
                        libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
                        libgbm1 libasound2 libpango-1.0-0 libcairo2
                '''
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
            }
        }
        
        stage('Lint & Type Check') {
            steps {
                sh 'npm run lint || true'
                sh 'npm run build'
            }
        }
        
        stage('Run Tests') {
            steps {
                withCredentials([
                    string(credentialsId: 'sf-jwt-client-id', variable: 'SF_JWT_CLIENT_ID'),
                    string(credentialsId: 'sf-jwt-username', variable: 'SF_JWT_USERNAME'),
                    string(credentialsId: 'sf-private-key', variable: 'SF_PRIVATE_KEY'),
                    string(credentialsId: 'sf-base-url', variable: 'SF_BASE_URL'),
                    string(credentialsId: 'atlassian-email', variable: 'ATLASSIAN_EMAIL'),
                    string(credentialsId: 'atlassian-api-token', variable: 'ATLASSIAN_API_TOKEN'),
                    string(credentialsId: 'zephyr-project-key', variable: 'ZEPHYR_PROJECT_KEY')
                ]) {
                    sh 'npm run test:all'
                }
            }
        }
        
        stage('Upload Results') {
            steps {
                withCredentials([
                    string(credentialsId: 'atlassian-email', variable: 'ATLASSIAN_EMAIL'),
                    string(credentialsId: 'atlassian-api-token', variable: 'ATLASSIAN_API_TOKEN'),
                    string(credentialsId: 'zephyr-project-key', variable: 'ZEPHYR_PROJECT_KEY')
                ]) {
                    sh 'npm run zephyr:UploadResult || true'
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'reports/**/*,test-results/**/*', fingerprint: true
            publishHTML([
                reportDir: 'reports',
                reportFiles: 'index.html',
                reportName: 'Test Report'
            ])
        }
        success {
            emailext(
                subject: "✅ E2E Tests Passed - Build ${env.BUILD_NUMBER}",
                body: "Test execution completed successfully.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
        failure {
            emailext(
                subject: "❌ E2E Tests Failed - Build ${env.BUILD_NUMBER}",
                body: "Test execution failed. Check console output for details.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}

