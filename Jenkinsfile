
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'python --version'
                bat 'python -m pip install -r requirements.txt'
            }
        }

        stage('Run Tests') {
            steps {
                bat 'python -m pytest -v'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t task-manager:1.0 .'
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Tests passed and Docker image built.'
        }
        failure {
            echo 'FAILED: Check the Jenkins console output.'
        }
    }
}
