<div align="center">
  <h1 align="center">🛒 OrderMailr – Smart Order Email System 📧</h1>
  <p align="center">
    <strong>A robust and secure Node.js application for automating transactional order confirmation emails.</strong>
  </p>
  
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js Badge"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js Badge"/>
  <img src="https://img.shields.io/badge/Nodemailer-4B834B?style=for-the-badge&logo=gmail&logoColor=white" alt="Nodemailer Badge"/>
  <img src="https://img.shields.io/badge/Security-dotenv-yellow?style=for-the-badge" alt="dotenv Badge"/>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License Badge"/>

</div>

---

### **Hey, Recruiters! 👋 A Quick Note For You:**

This isn't just another project; it's a demonstration of core backend development skills essential for modern web applications. **OrderMailr** solves a real-world business need: **automated, real-time communication with customers and administrators.**

This project showcases my ability to:
* **Build a Secure API:** Implement a Node.js/Express server that securely handles data.
* **Manage Sensitive Credentials:** Use `dotenv` and `.gitignore` to protect secret keys, a fundamental security practice.
* **Integrate Third-Party Services:** Utilize the Nodemailer library to connect with an external email service provider (like Gmail).
* **Create a Full-Stack Workflow:** Connect a simple frontend to a backend service to create a complete user-to-server interaction.
* **Write Clean, Maintainable Code:** Structure the application logically for easy understanding and future scaling.

---

### ✨ **Live Demo & Visuals**

Check out the live application here! (It's a great way to see it in action.)

**[🚀 Live Demo Link]** ``

<p align="center">
  </p>

---

## 🎯 **Core Features**

* **🔐 Secure & Safe:** All email credentials are kept out of the codebase using environment variables.
* **📨 Dual Email System:**
    * **🧑‍🌾 Customer Confirmation:** Instantly sends a beautifully styled HTML email to the customer upon placing an order.
    * **🧑‍💼 Admin Notification:** Immediately alerts the business owner with all necessary order details.
* **💅 Modern HTML Templates:** Emails aren't plain text! They are styled with HTML/CSS for a professional look and feel.
* **⚙️ Built on a Robust Stack:** Leverages the power of Express.js for the server and Nodemailer for email transport.
* **☁️ Cloud-Ready:** Designed for easy deployment on modern hosting platforms like Render or Railway.

---

## 🛠️ **Technology Stack**

| Technology | Purpose                               |
| :---         | :---                                  |
| **Node.js** | Backend JavaScript Runtime Environment |
| **Express.js**| Web Framework for building the API     |
| **Nodemailer**| Library for sending emails from Node.js|
| **Dotenv** | For managing secret environment variables |
| **HTML5/CSS3**| For the frontend UI and email templates |
| **Git & GitHub**| Version Control & Hosting              |

---

## ⚙️ **Getting Started Locally**

Want to run the project on your own machine? Just follow these steps.

### **1. Prerequisites**
* Node.js (v14 or higher)
* npm (Node Package Manager)
* A Gmail account with **2-Factor Authentication** enabled.

### **2. Clone & Install**

```bash
# Clone the repository
git clone [https://github.com/](https://github.com/)[Your-Username]/ordermailr.git

# Navigate into the project directory
cd ordermailr

# Install all the required dependencies
npm install

### **3.Configure Your Environment**
1.Create a file named .env in the root of the project.

2.Generate a Gmail App Password. (Do not use your regular Gmail password). You can find instructions here.

3.Add your credentials to the .env file:

# Your sending email address
GMAIL_USER=your_email@gmail.com

# Your 16-digit Gmail App Password
GMAIL_PASS=your_app_password

# The port your server will run on
PORT=3000

### **4.Run the Server**
node server.js
🎉 Your application is now running! Visit http://localhost:3000 in your browser.

