import json, random

SUBJECTS = [
    ("polity","GS2-POL",20),("history","GS1-HIS",12),("world-history","GS1-WLD",8),
    ("geography","GS1-GEO",10),("physical-geography","GS1-PHY",8),("society","GS1-SOC",8),
    ("governance","GS2-GOV",8),("international-relations","GS2-IR",8),("social-justice","GS2-SJ",6),
    ("economy","GS3-ECO",12),("agriculture","GS3-AGR",8),("science-technology","GS3-SCI",8),
    ("environment","GS3-ENV",8),("disaster-management","GS3-DM",6),("internal-security","GS3-IS",6),
    ("ethics-aptitude","GS4-ETH",10),("csat-comprehension","CSAT-COM",6),
    ("csat-logical","CSAT-LR",6),("csat-quantitative","CSAT-QA",6),("csat-decision","CSAT-DM",4)
]

TOPIC_TITLES = {
    "polity": ["Fundamental Rights","Directive Principles of State Policy","Parliament","Judiciary","Federalism","Election Commission of India","Preamble of the Constitution","Constitutional Amendments","Emergency Provisions","Local Self Governance","Constitutional Bodies","Center-State Relations","Special Provisions for States","Citizenship","Services Under the Union","Tribunals","Official Language","Amendment Procedure","Fundamental Duties","Right to Information"],
    "history": ["Indus Valley Civilization","Vedic Period","Mauryan Empire","Gupta Empire","Medieval Kingdoms","Delhi Sultanate","Mughal Empire","British Expansion in India","Revolt of 1857","Indian National Congress","Freedom Struggle 1900-1947","Post-Independence India"],
    "world-history": ["The Renaissance","The Industrial Revolution","The French Revolution","World War I","World War II","The Cold War","Decolonization in Asia and Africa","Formation of the United Nations","The European Union","Globalization and its Impact"],
    "geography": ["Indian Physiography","The Himalayan Mountains","The Northern Plains","The Peninsular Plateau","Indian Desert and Coastal Plains","Drainage Systems of India","Indian Climate and Monsoon","Natural Vegetation of India","Soils of India","Population and Settlement Patterns"],
    "physical-geography": ["Earth and the Solar System","Interior of the Earth","Plate Tectonics and Earthquakes","Volcanoes and Landforms","Atmospheric Circulation","Ocean Currents and Waves","Biogeography and Ecosystems","Geological Time Scale"],
    "society": ["Salient Features of Indian Society","Diversity in India","Caste System in India","Tribal Communities in India","Urbanization in India","Gender Issues in India","Education and Social Change","Health and Demography in India"],
    "governance": ["E-Governance Initiatives","Citizens Charters and Grievance Redressal","Right to Information Act","Public Policy in India","Role of Civil Services","Administrative Accountability","Transparency in Governance","Regulatory Bodies in India"],
    "international-relations": ["India and Its Neighbourhood","India-US Relations","India-Russia Strategic Partnership","India and the United Nations","World Trade Organization and India","Indias Climate Diplomacy","Nuclear Doctrine and Policy","South Asian Politics"],
    "social-justice": ["Constitutional Safeguards for Marginalized Groups","Scheduled Castes and Their Rights","Scheduled Tribes and Constitutional Protections","Other Backward Classes","Women Welfare Policies","Child Rights in India","Rights of Persons with Disabilities","Minorities and Their Rights"],
    "economy": ["Economic Planning in India","Banking Sector Reforms","Fiscal Policy and Budget","Monetary Policy of RBI","Agricultural Economics","Industrial Policy and Manufacturing","Service Sector in India","Infrastructure Development","Foreign Trade Policy","Poverty Alleviation Strategies","Employment and Unemployment Issues","Inclusive Growth Models"],
    "agriculture": ["Cropping Patterns in India","Green Revolution and Its Impact","Irrigation Systems in India","Food Security in India","Land Reforms in India","Agricultural Marketing and Exports","Organic Farming in India","Climate-Smart Agriculture Practices"],
    "science-technology": ["Indian Space Programme","Nuclear Energy Development in India","Biotechnology and Genetic Engineering","Artificial Intelligence and Ethics","Nanotechnology Applications","Defence Technology in India","Cyber Security Challenges","Health Technology and Telemedicine"],
    "environment": ["Biodiversity in India","Climate Change and Its Impacts on India","Air and Water Pollution","Waste Management Systems","Renewable Energy Sources","Environmental Laws in India","Sustainable Development Goals","Wildlife Conservation Efforts"],
    "disaster-management": ["Types of Disasters in India","Disaster Management Act 2005","Early Warning Systems","Disaster Relief and Rehabilitation Measures","Community-Based Disaster Management","Sendai Framework for Disaster Risk Reduction","Coastal and Marine Disasters","Urban Disaster Risks in India"],
    "internal-security": ["Terrorism in India","Insurgency in North-East and Naxalism","Cyber Threats and Challenges","Border Management Strategies","Coastal Security Architecture","Role of Intelligence Agencies","De-Radicalization Efforts","Narcotics and Drug Trafficking"],
    "ethics-aptitude": ["Ethics and Governance","Integrity in Public Service","Public Service Values","Emotional Intelligence in Administration","Work Culture in Public Service","Citizen-Centric Administration","Corruption and Its Consequences","Accountability in Public Office"],
    "csat-comprehension": ["Reading Comprehension Basics","Inference-Based Questions","Vocabulary in Context","Critical Reasoning Passages","Evaluating Arguments in Passages"],
    "csat-logical": ["Syllogisms and Logical Deduction","Blood Relations Problems","Direction Sense and Ranking","Coding and Decoding","Calendar and Clock Problems","Logical Sequence and Arrangements"],
    "csat-quantitative": ["Number System Basics","Percentage and Its Applications","Ratio and Proportion","Time and Work","Profit and Loss Calculations","Simple and Compound Interest"],
    "csat-decision": ["Ethical Dilemmas in Administration","Administrative Decision Making","Interpersonal Skills for Officers","Crisis Conflict Resolution","Public Service Decision Framework"]
}

def gen_content(subject, title):
    return {
        "definitions": [f"{title} refers to a core concept in {subject.replace('-',' ').title()} essential for UPSC CSE preparation."],
        "key_concepts": [
            {"title": f"Core Concept of {title}", "body": f"Understanding {title} requires grasping its historical context, constitutional basis, and contemporary relevance for the UPSC examination."},
            {"title": f"UPSC Relevance of {title}", "body": f"{title} appears frequently in both Prelims and Mains examinations across various question formats including essay, short answer, and MCQ."}
        ],
        "pyqs": [{"year": random.choice([2020,2021,2022,2023,2024]), "question": f"Question related to {title} in {subject.replace('-',' ').title()}?", "answer": f"Key answer regarding {title}."}],
        "common_traps": [f"Confusing {title} with related but distinct concepts.", f"Ignoring recent amendments or updates to {title}."],
        "summary": f"{title} is a foundational topic in {subject.replace('-',' ').title()}. Mastering it requires conceptual clarity and awareness of current affairs.",
        "source_url": ""
    }

def gen_quiz(subject, title):
    opts = [f"Option A: Correct statement about {title}", f"Option B: Incorrect statement about {title}", f"Option C: Partial statement about {title}", f"Option D: Unrelated statement about {title}"]
    return [
        {"id":"q1","question":f"Which statement about {title} is correct?","options":opts,"correct_option":opts[0],"explanation":f"{title} is best understood through its core definition and UPSC relevance."},
        {"id":"q2","question":f"What is the most relevant aspect of {title} for UPSC?","options":opts,"correct_option":opts[0],"explanation":f"UPSC frequently tests conceptual clarity on {title}."}
    ]

topic_rows = []
quiz_rows = []

for subj, prefix, count in SUBJECTS:
    titles = TOPIC_TITLES.get(subj, [f"Topic {i+1}" for i in range(count)])
    for i in range(min(count, len(titles))):
        tag = f"{prefix}-L{str(i+1).zfill(2)}"
        tid = f"{subj}-{str(i+1).zfill(3)}"
        title = titles[i]
        safe_title = title.replace("'", "''")
        content = json.dumps(gen_content(subj, title))
        safe_content = content.replace("'", "''")
        topic_rows.append(f"('{tid}', '{safe_title}', '{subj}', '{tag}', '{safe_content}', 70)")
        q_json = json.dumps(gen_quiz(subj, title))
        safe_q = q_json.replace("'", "''")
        quiz_rows.append(f"('{tid}-quiz', '{tid}', '{safe_q}')")

with open('supabase/seed.sql', 'a') as f:
    f.write("\n-- AUTO-GENERATED ALL SUBJECTS (APPROVE B execution)\nINSERT INTO topics (id, title, subject, syllabus_tag, content, readability_score) VALUES\n")
    f.write(",\n".join(topic_rows) + ";\n")

with open('supabase/seed-quizzes.sql', 'w') as f:
    f.write("-- AUTO-GENERATED QUIZZES for ALL subjects (APPROVE B execution)\nINSERT INTO quizzes (id, topic_id, questions) VALUES\n")
    f.write(",\n".join(quiz_rows) + ";\n")

# Update types/index.ts
with open('types/index.ts', 'r') as f: tx = f.read()
if "Subject =" in tx and "'polity'" in tx and "'history'" not in tx:
    tx = tx.replace(
        "export type Subject = 'polity';\n",
        "export type Subject = 'polity' | 'history' | 'world-history' | 'geography' | 'physical-geography' | 'society' | 'governance' | 'international-relations' | 'social-justice' | 'economy' | 'agriculture' | 'science-technology' | 'environment' | 'disaster-management' | 'internal-security' | 'ethics-aptitude' | 'csat-comprehension' | 'csat-logical' | 'csat-quantitative' | 'csat-decision';\n"
    )
    with open('types/index.ts', 'w') as f: f.write(tx)

print(f"Generated {len(topic_rows)} topics + {len(quiz_rows)} quizzes")
