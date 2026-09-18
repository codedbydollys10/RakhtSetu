================================================== 
27. HOSPITAL NETWORK 
================================================== 
 
Create a collaboration screen. 
 
Show: 
 
Partner Hospitals 
Partner NGOs 
Recent Requests 
Shared Capacity 
 
Hospital cards should show: 
 
Hospital name 
Area 
Network status 
Blood bank status 
 
Allow: 
 
Request Support 
Send Message 
View Shared Requests 
 
================================================== 
28. NGO PARTNER ORGANISATIONS 
================================================== 
 
Show: 
 
Hospitals 
NGOs 
Blood Banks / partner organisations 
 
For each: 
 
Organisation 
Location 
Verification status 
Active network status 
Requests coordinated 
 
Actions: 
 
Message 
Request Support 
View Network Activity 
 
================================================== 
29. ANALYTICS 
================================================== 
 
NGO analytics should be meaningful. 
 
Charts: 
 
Donor Availability 
Blood Requests by Group 
Request Fulfillment Rate 
Average Response Time 
Donor Retention 
Active vs Inactive Donors 
Requests by Urgency 
Monthly Donation Activity 
 
Use simple readable charts. 
 
Do NOT overload the page. 
 
Add date filters: 
 
7 days 
30 days 
90 days 
Custom 
 
================================================== 
30. DONOR CAPACITY 
================================================== 
 
Create a special NGO page: 
 
"Donor Capacity" 
 
Visualise: 
 
Active Donors 
Available Now 
Temporarily Unavailable 
Inactive 
Potentially Re-engageable 
 
This directly addresses the requirement to better understand available donor capacity. 
 
================================================== 
31. DUPLICATE OUTREACH PREVENTION 
================================================== 
 
Create a UI feature: 
 
"Outreach Protection" 
 
If another NGO has already contacted a donor for the same request: 
 
Show: 
 
"Already contacted for REQ-1024" 
 
Instead of sending another request. 
 
This demonstrates that the platform is not merely another donor database. 
 
================================================== 
32. REQUEST LIFECYCLE 
================================================== 
 
Every blood request should visually progress through: 
 
Created 
↓ 
Verification Pending 
↓ 
Verified 
↓ 
Matching 
↓ 
Donors Contacted 
↓ 
Donor Confirmed 
↓ 
Hospital Confirmation 
↓ 
Fulfilled 
 
Use a progress timeline. 
 
================================================== 
33. URGENCY SYSTEM 
================================================== 
 
Create three levels: 
 
CRITICAL 
URGENT 
NORMAL 
 
Critical requests: 
Use stronger visual hierarchy. 
 
Urgent: 
Moderate emphasis. 
 
Normal: 
Standard card. 
 
Never use flashing effects. 
 
================================================== 
34. PRIVACY & TRUST 
================================================== 
 
Create a dedicated Privacy page. 
 
Explain: 
 
- Donor information is protected 
- Exact location is not publicly displayed 
- Patient identity is minimised 
- Medical eligibility is not determined by AI 
- Organisations only see information necessary for coordination 
- Verification is required before widespread request circulation 
 
Create privacy controls inside donor settings. 
 
================================================== 
35. VERIFICATION BADGES 
================================================== 
 
Use: 
 
Verified Hospital 
Verified NGO 
Verified Requirement 
Verified Network Partner 
 
Use a small shield/check icon. 
 
Never imply medical certification where only organisational verification exists. 
 
================================================== 
36. DEMO DATA 
================================================== 
 
Populate the entire frontend with realistic mock data. 
 
Create: 
 
10+ donors 
5 hospitals 
4 NGOs 
10 blood requests 
Multiple blood groups 
Multiple urgency levels 
Different donor availability statuses 
Donation history 
Notifications 
Messages 
Analytics 
 
Include at least: 
 
O+ 
O- 
A+ 
A- 
B+ 
B- 
AB+ 
AB- 
 
Create realistic Indian city/area examples. 
 
Use Mumbai-style locations for demonstration data. 
 
Examples: 
Andheri 
Bandra 
Borivali 
Thane 
Mulund 
Ghatkopar 
Dadar 
Kurla 
 
Do not use real people's personal information. 
 
================================================== 
37. DEMO MODE 
================================================== 
 
Add: 
 
"Explore Demo" 
 
On landing page. 
 
When clicked: 
 
Show: 
 
Continue as Hospital 
Continue as NGO 
Continue as Donor 
 
Each opens the corresponding dashboard. 
 
This is extremely important for the competition demo. 
 
================================================== 
38. ANIMATIONS 
================================================== 
 
Use subtle high-quality animations. 
 
Use: 
 
- Page transitions 
- Fade-up sections 
- Hover card movement 
- Animated counters 
- Button micro-interactions 
- Sidebar transitions 
- Modal transitions 
- Progress animations 
- Notification slide-ins 
- Availability toggle animation 
- Donor matching animation 
- Request lifecycle animation 
 
Do NOT animate everything. 
 
The animation should feel smooth and purposeful. 
 
Use Framer Motion if using React. 
 
================================================== 
39. RESPONSIVE DESIGN 
================================================== 
 
The website must work perfectly on: 
 
Desktop 
Laptop 
Tablet 
Mobile 
 
Desktop: 
Sidebar dashboard 
 
Mobile: 
Bottom navigation / collapsible menu 
 
Forms should be mobile-friendly. 
 
Cards should stack properly. 
 
================================================== 
40. ACCESSIBILITY 
================================================== 
 
Use: 
 
- Good colour contrast 
- Visible focus states 
- Readable font sizes 
- Proper buttons 
- Form labels 
- Accessible icons 
- Keyboard navigation 
- Do not rely only on colour to indicate status 
 
================================================== 
41. COMPONENT SYSTEM 
================================================== 
 
Create reusable components: 
 
Navbar 
Sidebar 
Button 
Card 
Modal 
Badge 
StatusBadge 
Input 
Select 
SearchBar 
Filter 
Tabs 
Toast 
Notification 
Avatar 
ProgressBar 
Timeline 
Chart 
RequestCard 
DonorCard 
HospitalCard 
NGOCard 
VerificationCard 
MatchCard 
EmptyState 
LoadingState 
ConfirmationModal 
 
================================================== 
42. PAGE STRUCTURE 
================================================== 
 
PUBLIC: 
 
/ 
 /how-it-works 
 /hospitals 
 /ngos 
 /donors 
 /impact 
 /signin 
 /register 
 
HOSPITAL: 
 
/hospital/dashboard 
/hospital/requests 
/hospital/requests/create 
/hospital/requests/:id 
/hospital/matches 
/hospital/network 
/hospital/messages 
/hospital/notifications 
/hospital/history 
/hospital/profile 
/hospital/settings 
 
NGO: 
 
/ngo/dashboard 
/ngo/donors 
/ngo/requests 
/ngo/verification 
/ngo/matching 
/ngo/campaigns 
/ngo/communication 
/ngo/analytics 
/ngo/partners 
/ngo/reports 
/ngo/profile 
/ngo/settings 
 
DONOR: 
 
/donor/dashboard 
/donor/requests 
/donor/availability 
/donor/history 
/donor/impact 
/donor/notifications 
/donor/profile 
/donor/privacy 
 
================================================== 
43. FRONTEND STATE 
================================================== 
 
Since there is no backend: 
 
Use mock JSON/state/local state to simulate: 
 
- Login 
- Registration 
- Request creation 
- Verification 
- Donor matching 
- Donor acceptance 
- Hospital-to-hospital requests 
- NGO coordination 
- Notifications 
- Availability 
- Messages 
- Request status changes 
 
Buttons should actually change the UI state. 
 
Do NOT create dead buttons. 
 
Example: 
 
If NGO clicks "Verify": 
 
Status should change from: 
 
Pending 
 
to: 
 
Verified 
 
If hospital creates request: 
 
It should appear in: 
 
My Requests 
 
If donor accepts: 
 
Hospital/NGO dashboard should show: 
 
"Donor Response Received" 
 
Simulate this through frontend state. 
 
================================================== 
44. MATCHING ENGINE DEMONSTRATION 
================================================== 
 
Implement frontend-only matching logic. 
 
Pseudo-priority: 
 
1. Blood group compatibility 
2. Donor availability 
3. Distance 
4. Urgency 
5. Donation interval 
6. Response history 
 
Generate a "Coordination Match Score." 
 
Example: 
 
92% 
 
But clearly label: 
 
"Coordination score — not medical eligibility." 
 
Create sorting/filtering. 
 
================================================== 
45. SEARCH & FILTER 
================================================== 
 
Implement functional frontend filters. 
 
Donor filters: 
Blood group 
Availability 
Area 
Distance 
Status 
 
Request filters: 
Blood group 
Urgency 
Status 
Hospital 
Date 
 
Organisation filters: 
Type 
Area 
Verification 
 
================================================== 
46. EMPTY / ERROR / LOADING STATES 
================================================== 
 
Every major page must have: 
 
Loading state 
Empty state 
Error state 
 
Example: 
 
"No active blood requests" 
 
"Your donor network currently has no matching requests." 
 
================================================== 
47. UX DETAILS 
================================================== 
 
Always tell users: 
 
What happened 
What they can do next 
Why something is pending 
What status means 
 
Example: 
 
Instead of: 
 
"Error" 
 
Use: 
 
"Request could not be submitted. Please complete the required verification information." 
 
Instead of: 
 
"Success" 
 
Use: 
 
"Blood request submitted and is now awaiting verification." 
 
================================================== 
48. LANDING PAGE STORYTELLING 
================================================== 
 
Structure: 
 
Hero 
 
Problem 
 
"Blood networks already exist. They are simply disconnected." 
 
Then: 
 
How RakSetu connects them. 
 
Then: 
 
For Hospitals 
For NGOs 
For Donors 
 
Then: 
 
How matching works. 
 
Then: 
 
Trust & Privacy. 
 
Then: 
 
Impact. 
 
Then: 
 
CTA: 
 
"Build a stronger blood network." 
 
================================================== 
49. IMPORTANT COMPETITION DIFFERENTIATION 
================================================== 
 
The website must communicate that RakSetu is NOT: 
 
"Just another blood donor database." 
 
The unique concept should be visible throughout the UI: 
 
CONNECTED COMMUNITY NETWORK 
 
Core differentiators: 
 
1. Verified blood requirements 
2. AI-assisted donor prioritisation 
3. Multi-stakeholder coordination 
4. Hospital-to-hospital support 
5. NGO donor-network management 
6. Donor availability management 
7. Donor re-engagement 
8. Duplicate outreach prevention 
9. Privacy-preserving contact 
10. Request lifecycle tracking 
 
================================================== 
50. DEMO SCENARIO 
================================================== 
 
Create one complete preloaded scenario. 
 
Example: 
 
Hospital: 
CityCare Hospital 
 
creates: 
 
Critical O+ request 
4 units 
 
Request status: 
 
Verification Pending 
 
NGO: 
 
UPAY Community Network 
 
verifies the request. 
 
Matching engine: 
 
Finds suitable donors. 
 
Donor: 
 
Aarav 
 
is available. 
 
NGO sends notification. 
 
Donor clicks: 
 
"I Can Help" 
 
Hospital receives: 
 
"Donor Response Received" 
 
Request lifecycle changes. 
 
Finally: 
 
"Fulfilled" 
 
This entire flow must be demonstrable in the frontend. 
 
================================================== 
51. VISUAL DETAILS 
================================================== 
 
Use: 
 
Soft ivory backgrounds 
Cranberry red accents 
Terracotta secondary accents 
Sage green success states 
Dark charcoal typography 
 
Use subtle decorative elements: 
 
Small blood-drop motifs 
Community connection lines 
Rounded shapes 
Soft organic curves 
 
Avoid: 
- Medical cross overload 
- ECG lines everywhere 
- Generic hospital imagery 
- Neon 
- Cyberpunk 
- Excessive gradients 
- Huge illustrations 
 
The visual language should feel: 
 
Warm 
Human 
Trustworthy 
Modern 
Community-driven 
 
================================================== 
52. FINAL QUALITY REQUIREMENT 
================================================== 
 
The final result must NOT look like a basic student CRUD project. 
 
It should feel like a real social-impact technology platform. 
 
A competition judge should immediately understand: 
 
WHO uses it 
WHY they use it 
HOW it works 
WHAT problem it solves 
HOW the three stakeholders interact 
WHERE AI is used 
HOW privacy is protected 
HOW the system reduces coordination delays 
 
The application should be visually impressive but extremely easy to understand. 
 
Prioritise UX over decorative complexity. 
 
Every screen should have a clear purpose. 
 
Every CTA should have a meaningful interaction. 
 
Use realistic mock data throughout. 
 
================================================== 
53. IMPORTANT SAFETY / MEDICAL LIMITATION 
================================================== 
 
This platform is a coordination system. 
 
It must NOT: 
 
- Diagnose patients 
- Determine medical eligibility 
- Guarantee blood compatibility 
- Replace doctors 
- Replace blood banks 
- Automatically approve medical donation eligibility 
 
The UI must explicitly communicate: 
 
"Final medical eligibility and transfusion decisions remain with authorised medical/blood-bank professionals." 
 
================================================== 
54. CODE QUALITY 
================================================== 
 
Use a clean component architecture. 
 
Separate: 
 
components 
pages 
layouts 
data 
hooks 
utils 
assets 
 
Keep mock data separate from UI components. 
 
Use reusable components instead of duplicating code. 
 
Use clean routing. 
 
Make the code easy to connect to a backend later. 
 
Do not over-engineer. 
 
================================================== 
55. FINAL OUTPUT 
================================================== 
 
Build the complete frontend. 
 
Do not provide only wireframes. 
 
Do not provide only a landing page. 
 
Do not provide placeholder boxes. 
 
Create all major screens described above. 
 
Ensure navigation works. 
 
Ensure demo accounts work. 
 
Ensure forms work through frontend state. 
 
Ensure filters work. 
 
Ensure matching works. 
 
Ensure request status changes work. 
 
Ensure notifications work. 
 
Ensure role-specific dashboards are completely different. 
 
Make the final product presentation-ready for a national-level social innovation competition. 
 
The most important principle: 
 
"Technology should disappear behind the human connection." 
 
RakSetu should feel like a platform built to help communities coordinate when every minute matters.