import express, { json } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import mailchimp from "@mailchimp/mailchimp_marketing";
import md5 from "md5";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

//Models & DBs
import Hub from "./models/hub.js";
import axios from "axios";
import { sendEmail } from "./util/sendMail.js";

// INTITIALIZE APP ENVIROMENT VARIABLES
dotenv.config();

const apiKey = process.env.MAILCHIMP_KEY;
const listId = process.env.LIST_ID;
const refListId = process.env.REFERRALS_LIST_ID;
const serverPrefix = "us21";

//Configs
mailchimp.setConfig({
  apiKey,
  server: serverPrefix,
});

// Connect to mongodb atlas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

// Serve static files from the 'fonts' directory
//app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

//MIDDLEWARES
app.use(morgan("dev"));
app.use(cors());

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//TEST
// app.get('/lists', async(req,res) => {

// const run = async () => {
//   const response = await mailchimp.lists.getAllLists();
//   console.log(response);
// };

// run();
// });

//Handle webhook request
app.post("/", async (req, res, next) => {
  try {
    let reqBody = await req.body;

    const {
      config: { action },
      api_url,
    } = reqBody;

    if (action.toLowerCase() === "attendee.updated") {
      //Fetch Order Data
      console.log("ACTION =>", action);

      const attendeeResponse = await axios.get(api_url, {
        headers: {
          Authorization: `Bearer ${process.env.EVENT_PRIVATE_TOKEN}`,
        },
      });

      const {
        data: {
          profile: { name, first_name, last_name, email },
          ticket_class_name,
        },
      } = attendeeResponse;

      console.log(name, first_name, last_name, email, ticket_class_name);

      //Find Referrer
      const foundReferrer = await Hub.findOne({
        "referrals.email": { $in: [email] },
      });

      //They were refer
      if (foundReferrer) {
        const invitee = foundReferrer.referrals.find((r) => r.email === email);

        //Check if invitee has already purchased
        if (!invitee.hasPurchase) {
          //Update referral
          const updatedUser = await Hub.findOneAndUpdate(
            {
              email: foundReferrer.email,
              "referrals.email": email,
            },
            {
              $set: {
                "referrals.$.hasPurchase": true,
                refCount: foundReferrer.refCount + 1,
              },
            },
            { new: true }
          );

          //Update referral in Mailchimp
          const subscriber_hash = md5(updatedUser.email.toLowerCase());

          await mailchimp.lists.updateListMember(listId, subscriber_hash, {
            merge_fields: {
              REFCOUNT: updatedUser.refCount,
              REFS: email,
            },
          });

          //Add or update invitee in Mailchimp
          const invitee_hash = md5(email.toLowerCase());

          await mailchimp.lists.setListMember(listId, invitee_hash, {
            email_address: email,
            status_if_new: "subscribed",
            merge_fields: {
              FNAME: first_name,
              LNAME: last_name,
              VALIDREF: updatedUser.email,
            },
          });

          console.log("EMAIL SENDING...");

          await sendEmail(
            updatedUser.email,
            `${name} - ${email}`,
            ticket_class_name,
            res
          );
        } else {
          res.sendStatus(200);
        }
      }
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    return res.json({ error: error });
  }
});

app.post("/refer", async (req, res) => {
  let { referees, refEmail, refName } = req.body;

  refName = refName.replace("_", " ");

  if (refEmail) {
    try {
      const foundUser = await Hub.findOne({ email: refEmail });

      //members to mailchimp
      const members = referees.map((ref) => ({
        email_address: ref.trim(),
        status_if_new: "subscribed",
        merge_fields: {
          REFERBY: refEmail,
          REFNAME: refName,
          COUNT: 0,
        },
      }));

      //members to db
      const dbMembers = referees.map((ref) => ({
        email: ref.trim(),
        hasPurchase: false,
      }));

      if (foundUser) {
        referees.forEach((newReferralEmail) => {
          const existingReferral = foundUser.referrals.find(
            (referral) => referral.email === newReferralEmail
          );

          if (existingReferral) {
            existingReferral.hasPurchase = false;
          } else {
            foundUser.referrals.push({
              email: newReferralEmail,
              hasPurchase: false,
            });
          }
        });

        await foundUser.save();

        await mailchimp.lists.batchListMembers(refListId, {
          members,
          update_existing: true,
        });

        // start

        async function processReferees(referees) {
          for (const ref of referees) {
            const subscriber_hash = md5(ref.toLowerCase().trim());
            console.log("ref =>", ref);

            await mailchimp.lists.setListMember(refListId, subscriber_hash, {
              email_address: ref.trim(),
              status_if_new: "subscribed",
              merge_fields: {
                REFERBY: refEmail,
                REFNAME: refName,
                COUNT: 1,
              },
            });
          }
        }

        await processReferees(referees);

        //  end
        return res.json({ success: true, status: 200 });
      } else {
        const userHub = new Hub({
          email: refEmail,
          refCount: 0,
          referrals: dbMembers,
        });

        await userHub.save();

        await mailchimp.lists.batchListMembers(refListId, {
          members,
          update_existing: true,
        });

        // start

        async function processReferees(referees) {
          for (const ref of referees) {
            const subscriber_hash = md5(ref.toLowerCase().trim());
            console.log("ref =>", ref);

            await mailchimp.lists.setListMember(refListId, subscriber_hash, {
              email_address: ref.trim(),
              status_if_new: "subscribed",
              merge_fields: {
                REFERBY: refEmail,
		REFNAME: refName,
                COUNT: 1,
              },
            });
          }
        }

        await processReferees(referees);

        //  end

        return res.json({ success: true, status: 200 });
      }
    } catch (error) {
      console.log(error);
      return res.json({ success: false, status: 500 });
    }
  } else {
    return res.json({ success: false, status: 500 });
  }
});

app.get("/refer", (req, res) => {
  const htmlForm = `
  <main style="height: 100%; position: relative; background-color: transparent !important; padding-top: 40px;">

  <div style="height: 100%; background-color: transparent !important;">

      <style>
          @import url('https://fonts.googleapis.com/css2?family=Raleway&family=Roboto:wght@400;500;700;900&display=swap');

          html,
          body {
              background-color: transparent !important;
              font-family: 'Roboto', 'Arial', sans-serif;
          }

          input:focus {
              outline: none;
          }

          p {
              color: #ffffff;
              font-size: 14.5px;
              line-height: 1.4em;
              margin-bottom: 20px;
          }

          ::-webkit-input-placeholder {
              color: rgb(167, 167, 167);
          }

          :-ms-input-placeholder {
              color: rgb(167, 167, 167);
          }

          ::-ms-input-placeholder {
              color: rgb(167, 167, 167);
          }

          :-moz-placeholder {
              color: rgb(167, 167, 167);
          }

          ::placeholder {
              color: rgb(167, 167, 167);
          }


          @media only screen and (max-width: 680px) {
              .main-container {
                  padding: 0 !important;
              }

              .wrapper {
                  padding: 0 5% !important;
              }

              .heading {
                  font-size: 26px !important;
                  padding: 0 10px;
              }

              .event {
                  width: 300px !important;
              }

          }

          @media (min-width:360px) and (max-width:640px) {

              .main-container {
                  padding: 30px 20px !important;
                  background-color: transparent !important;
              }

              .wrapper {
                  padding: 0 1% !important
              }

          }

      </style>
      <div style="display: flex; justify-content: center; padding-bottom: 20px; width: 100%; box-sizing: border-box;">
          <form style="max-width: 100%; padding: 30px 10px; background:#8BA7BD;border-radius: 5px;" id='form'>
              <div class="main-container" style="height: fit-content; width: 500px; background-color: transparent !important; padding:0 35px; max-width: 100%; box-sizing: border-box; margin: 0;">
                  <h1 style="color:#0E1F2F; font-size: 22px; line-height: 1.15em; margin-bottom: 20px; font-family: 'Roboto', 'Arial', sans-serif;">Refer a Friend and get a coupon for FREE Joe Cipriano Promo Masterclass Merch!</h1>
                  <p class="sub-title" style="font-family: 'Raleway', 'Roboto','Arial', sans-serif;  font-size:14.5px; line-height:1.4em;">Think you know a friend who would like to take either Joe’s “Intro to Promos” or “Promo Masterclass” online courses?</p>
                  <p class="des" style="font-weight: 400; font-size:14.5px; line-height:1.4em; color: #ffffff; font-family: 'Raleway', 'Roboto','Arial', sans-serif;">Your referral will save them up to $100 and when they enroll, you'll received a coupon for FREE merch.</p>
                  <p class="des" style="font-weight: 600; font-size:14.5px; line-height:1.4em; color: #ffffff; font-family: 'Raleway', 'Roboto','Arial', sans-serif; ">The more friends who sign up, the more free stuff you get!</p>

                  <div class="form-inline">
                      <div style="display: flex; position: relative;">
                          <div style="display: flex; flex-direction: column; padding: 0px;  position: relative; flex: 1 1 0%;">
                              <style>
                                  * {
                                      margin-block: unset;
                                  }

                              </style>

                          </div>
                      </div>
                      <div class="wrapper" style="padding: 0 !important;">
                          <div style="display: flex; position: relative;">

                          </div>

                          <div style="position: relative;">
                              <div style=" padding: 10px 0px 0; background-color: rgba(255, 255, 255, 0); ">
                                  <div style="display: flex; width: 100%; flex-direction: column;">
                                      <div style="display: flex;">
                                          <input required class="email" id="" placeholder="example1@gmail.com,example2@outlook.com" aria-required="true" style="color: rgb(0, 0, 0); font-family: 'Roboto', Arial; font-size: 16px; font-weight: 400; width: 100%; height: 55px; padding-left: 16px; border: 2px solid rgba(142, 142, 142, 0.3); border-radius: 3px; box-sizing: border-box;">
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                  </div>
                  <div class="wrapper" style="padding: 0 !important;">
                      <div class="message">
                          <div style="display: flex; flex-direction: column; padding: 10px 0 6px; background-color: rgba(255, 255, 255, 0); position: relative; flex: 1 1 0%;">
                              <button type="submit" class="submitBtn" style="font-family: 'Roboto', Arial, sans-serif; font-weight: 600; font-size: 18px;  color: rgb(255, 255, 255); background-color: #E81013; border-radius: 2px; border: 0px solid rgb(34, 34, 34); border-radius: 5px; height: 60px; width: 100%; padding: 0px; margin: 0px auto; cursor: pointer;">
                                  <style>
                                      button:hover {
                                          background-color: #cb0b0d !important;
                                      }

                                  </style>
                                  SUBMIT
                              </button>

                          </div>
                          <p class="error-msg" style="padding-top: 15px; display: none">
                              <span style="color:red;">*</span> Oops! One or two emails entered are incorrect. Please check and try again
                          </p>
                      </div>
                  </div>
              </div>
              <div class='success-msg' style="display:none; height: fit-content; width: 500px; background-color: transparent !important; padding:30px 35px; max-width: 100%; box-sizing: border-box; margin: 0;">
                  <h1 style="color:#0E1F2F;font-size: 26px;line-height: 1.15em;
    margin-bottom: 10px; font-family: 'Roboto', 'Arial', sans-serif; text-align:center;">THANK YOU!</h1>
                  <p style="font-family: 'Raleway','Roboto', sans-serif; text-align: center;  font-size:16px; line-height:1.4em; color:#ffffff;">An email has been sent to your friend. If they enroll in one of our online courses with your discount code, you'll be sent your coupon code for FREE stuff.</p>
              </div>
          </form>
      </div>
  </div>


  <!-- core  -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js" integrity="sha512-pumBsjNRGGqkPzKHndZMaAG+bir374sORyzM3uulLV14lN5LyykqNk8eEeUlUkB3U0M4FApyaHraT65ihJhDpQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>


  <script type="text/javascript">
      $(document).ready(function() {

          const urlParams = new URLSearchParams(window.location.search);

          const refEmail = urlParams.get('user');
          const refName = urlParams.get('name');

          refEmail && localStorage.setItem('refEmail', refEmail);
          refName && localStorage.setItem('refName', refName);


          $('#form').submit(function(e) {
              e.preventDefault();

              let errorMsg = $('.error-msg');

              let email = $('.email').val().trim();

              let referees = email.split(',');

              let foundError = referees.filter(email => {
                  return !email.includes('@');
              })

              const refEmailFromStorage = localStorage.getItem('refEmail');
              const refNameFromStorage = localStorage.getItem('refName');

              if (foundError.length > 0) {
                  errorMsg.show();
              } else {
                  if (refEmail || refEmailFromStorage) {
                       errorMsg.hide();
                      
                      $.ajax({
                          url: 'https://joe-promomasterclass.onrender.com/refer',
                          data: {
                              "refEmail": refEmail || refEmailFromStorage,
                              "refName": refName || refNameFromStorage,
                              "referees": referees
                          },
                          type: "post",
                          dataType: "json",
                          success: function(json) {
                              if (json.success) {
                                  $('.main-container').hide();
                                  $('.success-msg').show();
                              } else {
                                  alert("Sorry, something went wrong!");
                              }

                          },
                          error: function(jqXHR, textStatus, errorThrown) {
                              alert("Sorry, something went wrong!");
                          }
                      })
                  } else {
                      alert('Something went wrong, reload the page and try again!')
                  }
              }


          })

      })

  </script>
</main>`;

  res.send(htmlForm);
});

app.get("*", (req, res) => {
  res.json({
    status: 400,
    message: "Bad request",
  });
});

//SET DEFAULT PORT IF IN DEVELOPMENT MODE
const PORT = process.env.PORT || 5000;

 connectDB().then(() => {
app.listen(PORT, () => {
  console.log(`Server running on ${PORT} in ${process.env.NODE_ENV} mode`);
});
 });
