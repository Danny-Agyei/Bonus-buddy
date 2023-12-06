import express, { json } from "express";
import dotenv from "dotenv";
import colors from "colors";
import morgan from "morgan";
import voucher_codes from "voucher-code-generator";
import path from "path";
import async from "async";
import jwt from "jsonwebtoken";
import mailchimp from "@mailchimp/mailchimp_marketing";
import md5 from "md5";
import nodemailer from "nodemailer";
import asyncHandler from "express-async-handler";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

//Models & DBs
import User from "./models/user.js";
import Hub from "./models/hub.js";

//Configs
mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_KEY,
  server: "us12",
});

const listId = process.env.LIST_ID;

// INTITIALIZE APP ENVIROMENT VARIABLES
dotenv.config();

// Connect to mongodb atlas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    // console.log(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

//Initial variables
let today = new Date();
let seconds = today.getSeconds();

//MIDDLEWARES
app.use(morgan("dev"));
app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Handle webhook request

app.post("/", async (req, res, next) => {
  const { type, data } = req.body;

  const email = data.email;

  if (type !== "subscribe") {
    console.log("Not subscribe");
    console.log(type, data);
    return res.end();
  } else {
    try {
      //Find the referral
      const foundUser = await Hub.findOneAndUpdate({
        referrals: { $in: [email] },
      });

      if (foundUser) {
        console.log(foundUser.email);

        //Update referral in MongoDB
        const updatedUser = await Hub.findOneAndUpdate(
          {
            email: foundUser.email,
          },
          { $set: { refCount: foundUser.refCount + 1 } },
          { new: true }
        );

        //Update referral in Mailchimp
        const subscriber_hash = md5(foundUser.email.toLowerCase());

        const response = await mailchimp.lists.updateListMember(
          listId,
          subscriber_hash,
          {
            merge_fields: {
              REFCOUNT: updatedUser.refCount,
            },
          }
        );

        return res.end();
      } else {
        console.log("User not found");
        return res.end();
      }
    } catch (error) {
      console.log(error.message);
      res.end();
    }
  }
});

// app.post("/", async (req, res, next) => {
//   const { type, data } = req.body;

//   if (type !== "subscribe") {
//     return res.end();
//   }

//   console.log("IM MAILCHIMP WEBHOOK REQUEST ==>");
//   //CHECK TO SEE IF COMPLETELY NEW SUBSCRIBER
//   if (data.merges.REFCODE.length < 1 && data.merges.REFERECODE.length < 1) {
//     try {
//       console.log("IM NEW SUBSCRIBER ==>");
//       const generatedCode = voucher_codes.generate({
//         length: 8,
//         count: 1,
//       });

//       let referralCode = generatedCode[0] + seconds;

//       const token = jwt.sign(
//         {
//           user: data.email,
//         },
//         "secretKey"
//       );

//       const newUser = new User({
//         email: data.email,
//         referralCode: referralCode,
//         shareUrl: process.env.SHARE_URL + "=" + referralCode,
//         referralSource: token,
//         totalReferrals: 0,
//         status: "subscribed",
//       });

//       console.log("Im in try code!");
//       console.log("USER INFO ==>", newUser);

//       const savedUser = await newUser.save();
//       const subscriber_hash = md5(savedUser.email.toLowerCase());

//       const response = await mailchimp.lists.updateListMember(
//         listId,
//         subscriber_hash,
//         {
//           merge_fields: {
//             REFCOUNT: 0,
//             SHAREURL: savedUser.shareUrl,
//             REFCODE: savedUser.referralCode,
//             REFSOURCE: savedUser.referralSource,
//           },
//         }
//       );
//       console.log("Successfully saved new user to DB!");
//       return console.log("Successfully updated user field in Mailchimp!");
//     } catch (error) {
//       console.log("error in try catch", error);
//       return console.log(error.message);
//     }
//   } else if (
//     data.merges.REFERECODE.length > 1 &&
//     data.merges.REFCODE.length > 1
//   ) {
//     //WAS REFERED BY SOMEONE
//     console.log("I'M REFFERED BY FRIEND ==>");
//     const user = new User({
//       userId: data.id,
//       email: data.email,
//       referralCode: data.merges.REFCODE,
//       shareUrl: data.merges.SHAREURL,
//       referralSource: data.merges.REFSOURCE,
//       totalReferrals: data.merges.REFCOUNT,
//       refereCode: data.merges.REFERECODE,
//       status: "subscribed",
//     });

//     //FIND REFEREE AND INCREMENT THEIR TOTALREFERRALS
//     async function run() {
//       const refereeUser = await User.findOne({
//         referralCode: data.merges.REFERECODE,
//       });

//       if (refereeUser) {
//         refereeUser.totalReferrals = refereeUser.totalReferrals += 1;

//         try {
//           //  UPDATE REFEREE IN DB
//           await user.save();
//           const updatedUser = await refereeUser.save();

//           //  UPDATE REFEREE IN MAILCHIMP
//           const addToRefcount = updatedUser.totalReferrals;
//           const email = updatedUser.email;
//           const subscriberHash = md5(email.toLowerCase());

//           const response = await mailchimp.lists.updateListMember(
//             listId,
//             subscriberHash,
//             {
//               merge_fields: {
//                 REFCOUNT: addToRefcount,
//               },
//             }
//           );
//         } catch (error) {
//           console.log(error.message);
//           return next(error);
//         }
//       }
//     }

//     run();
//   }
// });

// Handle referring form submit

app.get("/success", async (req, res) => {
  res.send(`<div style="display: flex; justify-content: center; padding-bottom: 40px; width: 100%; box-sizing: border-box;">

  <style>
  @import url('https://fonts.googleapis.com/css2?family=Raleway&family=Roboto:wght@400;500;700;900&display=swap');
  </style>

  <div style="height:100%;max-width: 100%;margin-top: 40px; padding: 50px 10px; background:#8BA7BD;border-radius: 5px;">
	  <div class="main-container" style="height: fit-content; width: 500px; background-color: transparent !important; padding:0 35px; max-width: 100%; box-sizing: border-box; margin: 0;">
		  <h1 style="color:#ffffff;font-size: 26px;line-height: 1.15em;
			margin-bottom: 25px; font-family: 'Roboto', 'Arial', sans-serif; text-align:center;">THANK YOU!</h1>
		  <p style="font-family: 'Raleway','Roboto', sans-serif; text-align: center;  font-size:16px; line-height:1.4em; color:#ffffff;"> An email has been sent to those address. You'll receive an email from us with your coupon code as promised after they enroll on our services.</p>
	  </div>
</div>
</div>`);
});

app.post("/refer", async (req, res) => {
  const { referees, username } = req.body;

  if (username) {
    const userHub = new Hub({
      email: username,
      refCount: 0,
      referrals: referees,
    });

    try {
      const foundUser = await Hub.findOne({ email: username });
      if (foundUser) {
        const updatedReferrals = referees.concat(foundUser.referrals);

        const updatedUser = await Hub.findOneAndUpdate(
          { _id: foundUser._id },

          {
            $set: {
              referrals: updatedReferrals,
            },
          },
          { new: true }
        );

        return res.json({ success: true, status: 200 });
      } else {
        await userHub.save();
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

		h1 {
			color:#0E1F2F;
			font-size: 26px;
			line-height: 1.15em;
			margin-bottom: 20px;
			font-family: 'Roboto', 'Arial', sans-serif;
		}

		p {
			color: #ffffff;
			font-size: 14.5px;
			line-height: 1.4em;
			margin-bottom: 20px;
		}

		button {
			font-family: 'Roboto', 'Arial', sans-serif;
			font-size: 25px;
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
				<h1>Refer a Friend and get a coupon for FREE Joe Cipriano Promo Masterclass Merch!</h1>
				<p class="sub-title" style="font-family: 'Raleway', 'Roboto','Arial', sans-serif;  font-size:14.5px; line-height:1.4em;">Think you know a friend or colleague who would like to take either Joe’s “Intro to Promos” or “Promo Masterclass” online courses?</p>
				<p class="des" style="font-weight: 400; font-size:14.5px; line-height:1.4em; color: #ffffff; font-family: 'Raleway', 'Roboto','Arial', sans-serif;">Your referral will save them up to $100 and when they enroll, you'll receive a coupon to shop for free.</p>
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
							<button type="submit" class="submitBtn" style="font-family: 'Roboto', Arial, sans-serif; font-weight: 600; font-size: 20px;  color: rgb(255, 255, 255); background-color: #E81013; border-radius: 2px; border: 0px solid rgb(34, 34, 34); border-radius: 5px; height: 60px; width: 100%; padding: 0px; margin: 0px auto; cursor: pointer;">
								<style>
									button:hover {
										background-color: #cb0b0d !important;
									}

								</style>
								SUBMIT
							</button>

						</div>
					</div>
				</div>
				</div>
				<div class='success-msg' style="display:none; height: fit-content; width: 500px; background-color: transparent !important; padding:30px 35px; max-width: 100%; box-sizing: border-box; margin: 0;">
						<h1 style="color:#ffffff;font-size: 26px;line-height: 1.15em;
					margin-bottom: 25px; font-family: 'Roboto', 'Arial', sans-serif; text-align:center;">THANK YOU!</h1>
					<p style="font-family: 'Raleway','Roboto', sans-serif; text-align: center;  font-size:16px; line-height:1.4em; color:#ffffff;"> An email has been sent to those address. You'll receive an email from us with your coupon code as promised after they enroll on our services.</p>
				</div>
		</form>
	</div>
</div>


<!-- core  -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js" integrity="sha512-pumBsjNRGGqkPzKHndZMaAG+bir374sORyzM3uulLV14lN5LyykqNk8eEeUlUkB3U0M4FApyaHraT65ihJhDpQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>


<script type="text/javascript">
$(document).ready(function() {


	function getQueryParameter(name) {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get(name);
	};

	const userEmail = getQueryParameter('user');

	const redirectLink = 'https://giant-pink-raincoat.cyclic.app/success';
	

	if (userEmail) {
		$('#form').submit(function(e) {
			e.preventDefault();

			let email = $('.email').val();


			const referees = email.split(',');

			if (email.length > 0 && email.includes("@")) {
				$.ajax({
					url: 'https://giant-pink-raincoat.cyclic.app/refer',
					data: {
						"username": userEmail,
						"referees": referees
					},
					type: "post",
					dataType: "json",
					success: function(json) {
						if(json.success){
							$('.main-container').hide();
							$('.success-msg').show();
						}else{
							alert("Sorry, something went wrong!");
						}
						
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert("Sorry, something went wrong!");
					}
				});
			} else {
				alert("Enter a valild email address")
			}


		})
	} else {
		alert("invalid url")
	}


})

</script></main>`;

  res.send(htmlForm);
});

app.get("/", (req, res) => {
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
