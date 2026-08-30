# Workforce Connect

A digital platform that connects workers with employers, making it easier to discover job opportunities, apply for work, and manage the hiring process.

## 🚀 Overview

**Workforce Connect** is designed to simplify the connection between skilled workers and employers.

Workers can create their profiles, showcase their skills and certifications, discover available jobs, and apply for suitable opportunities.

Employers can create their company profile, post jobs, review applicants, approve suitable candidates, and provide ratings after the completion of work.

The platform aims to make the process more transparent, accessible, and efficient for both sides.

## ✨ Key Features

### 👷 Worker

- Create and manage a worker profile
- Add skills and certifications
- Add work experience and location
- View available job opportunities
- View detailed job information
- Apply for jobs
- Track application status
- View employer contact information after application approval
- View ratings and feedback from previous employers

### 🏢 Employer

- Create and manage company profile
- Add company information, industry, location, website, and contact details
- Post new job opportunities
- Specify job description, location, salary, job type, and required skills
- View applicants for posted jobs
- Review worker profiles, skills, experience, certifications, and ratings
- Approve suitable applicants
- Mark work as completed
- Rate workers based on:
  - Work Quality
  - Professionalism
  - Punctuality
  - Responsiveness
  - Behaviour
- Add optional feedback for completed work

### 🔐 Authentication & Access Control

- Role-based access for Workers and Employers
- Protected application functionality
- Users can access features according to their role
- Database-level security policies are used to protect application data

## 🛠️ Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

**Backend & Database**
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

## 🔄 Application Flow

### Worker Flow

Register / Login
      ↓
Create Worker Profile
      ↓
Browse Jobs
      ↓
View Job Details
      ↓
Apply for Job
      ↓
Wait for Employer Approval
      ↓
Application Approved
      ↓
Contact Employer
      ↓
Complete Work
      ↓
Receive Rating & Feedback

**Employer Flow**

Register / Login
      ↓
Create Company Profile
      ↓
Post Job
      ↓
Receive Applications
      ↓
Review Worker Profiles
      ↓
Approve Worker
      ↓
Work Completed
      ↓
Rate & Review Worker

## Worker Rating System

Workforce Connect uses a multi-dimensional rating system instead of relying only on a single overall score.
Employers can evaluate workers on:

- Category	Description
- Work Quality	Quality of the completed work
- Professionalism	Professional conduct and attitude
- Punctuality	Timeliness and reliability
- Responsiveness	Communication and response time
- Behaviour	Overall behaviour during the engagement

These ratings contribute to the worker's overall reputation on the platform.

 ## Database

The application uses Supabase PostgreSQL for persistent data storage.
The database handles important entities such as:

- User profiles
- Worker profiles
- Company profiles
- Jobs
- Applications
- Worker ratings and feedback

Row Level Security (RLS) is used to control access to sensitive data.

## Problem We Are Solving

Finding reliable skilled workers can be difficult for employers, while skilled workers often struggle to discover suitable opportunities and demonstrate their experience.

**Workforce Connect aims to bridge this gap by providing a single platform where:**

- Workers can showcase their skills and experience.
- Employers can discover and evaluate workers.
- Job opportunities can be posted and managed digitally.
- Application progress can be tracked.
- Completed work can generate ratings and feedback.
- Worker reputation can be built through previous work.

## Future Improvements

Some potential improvements include:

- Worker and employer verification
- Advanced job search and filtering
- Location-based job discovery
- Notifications for application updates
- In-app messaging
- Resume generation and upload
- AI-based worker-job matching
- Improved recommendation system

## Hackathon Project

Workforce Connect was developed as a hackathon project with the goal of building a practical digital solution for connecting workers and employers.
The project focuses on creating a simple, accessible workflow for discovering jobs, managing applications, and building trust through worker profiles and ratings.


