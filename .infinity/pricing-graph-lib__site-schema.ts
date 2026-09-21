export const SITE_SCHEMA: Record<string, unknown> = {
  "/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/#webpage",
        "name": "Compare commercial lease economics — early validation",
        "url": "/",
        "description": "A focused early-validation workflow for comparing commercial lease economics, NPV, and discount-rate sensitivity. Pilot access only. No payment is collected.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "/#website",
        "name": "Commercial lease NPV comparison",
        "url": "/",
        "publisher": {
          "@id": "/#operator"
        }
      },
      {
        "@type": "Organization",
        "@id": "/#operator",
        "name": "An Infinity OS Venture",
        "url": "https://imros.io",
        "description": "Operator attribution. No reviews, ratings, employee counts, or awards are claimed."
      }
    ]
  },
  "/compare-commercial-leases": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/compare-commercial-leases#webpage",
        "name": "How to compare commercial lease options",
        "url": "/compare-commercial-leases",
        "description": "A practical way to compare two commercial leases when rent schedules, TI, free rent, and CAM differ.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to compare commercial lease options",
            "item": "/compare-commercial-leases"
          }
        ]
      }
    ]
  },
  "/how-it-works": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/how-it-works#webpage",
        "name": "How the proposed lease comparison workflow works",
        "url": "/how-it-works",
        "description": "The proposed steps for moving a commercial lease comparison from a rebuilt spreadsheet to a shareable NPV and client summary.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How the proposed lease comparison workflow works",
            "item": "/how-it-works"
          }
        ]
      },
      {
        "@type": "HowTo",
        "name": "Compare commercial lease options in the proposed workflow",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Capture terms",
            "text": "Enter rent, term, escalations, TI, free rent, and CAM for each option."
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Normalize cash flows",
            "text": "Place each cost and incentive on a shared timeline."
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Discount to NPV",
            "text": "Convert the stream to present value at an explicit discount rate."
          },
          {
            "@type": "HowToStep",
            "position": 4,
            "name": "Share the comparison",
            "text": "Review sensitivity and a client-facing summary. Illustrative only."
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/#webpage",
        "name": "Commercial lease NPV",
        "url": "/commercial-lease-npv/",
        "description": "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Commercial lease NPV",
            "item": "/commercial-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Commercial lease NPV",
        "description": "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
        "mainEntityOfPage": "/commercial-lease-npv/#webpage"
      }
    ]
  },
  "/pricing": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/pricing#webpage",
        "name": "Early validation pricing hypotheses",
        "url": "/pricing",
        "description": "Early validation pricing hypotheses: $290 per year or $149 per deal. Interest only. Payment is not collected.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Early validation pricing hypotheses",
            "item": "/pricing"
          }
        ]
      }
    ]
  },
  "/for/tenant-rep-brokers": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/for/tenant-rep-brokers#webpage",
        "name": "For tenant-rep brokers comparing commercial leases",
        "url": "/for/tenant-rep-brokers",
        "description": "A tenant-representation workflow for comparing commercial leases with NPV, sensitivity, and a shareable client summary. Pilot only.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "For tenant-rep brokers comparing commercial leases",
            "item": "/for/tenant-rep-brokers"
          }
        ]
      }
    ]
  },
  "/resources": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/resources#webpage",
        "name": "Commercial lease economics resources",
        "url": "/resources",
        "description": "A bounded guide to commercial lease economics topics used when comparing occupancy cost and NPV.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Commercial lease economics resources",
            "item": "/resources"
          }
        ]
      },
      {
        "@type": "CollectionPage",
        "name": "Commercial lease economics resources",
        "hasPart": [
          {
            "@id": "/commercial-lease-npv#webpage"
          },
          {
            "@id": "/compare-commercial-leases#webpage"
          },
          {
            "@id": "/tenant-improvement-allowance#webpage"
          },
          {
            "@id": "/discount-rate-sensitivity#webpage"
          }
        ]
      },
      {
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Commercial lease NPV",
            "url": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Compare commercial leases",
            "url": "/compare-commercial-leases"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Tenant improvement allowance",
            "url": "/tenant-improvement-allowance"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "Discount-rate sensitivity",
            "url": "/discount-rate-sensitivity"
          }
        ]
      }
    ]
  },
  "/discount-rate-sensitivity": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/discount-rate-sensitivity#webpage",
        "name": "Discount-rate sensitivity in lease NPV",
        "url": "/discount-rate-sensitivity",
        "description": "Why the discount rate moves commercial lease NPV and how to keep the assumption visible beside the terms.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Discount-rate sensitivity in lease NPV",
            "item": "/discount-rate-sensitivity"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Discount-rate sensitivity in lease NPV",
        "description": "Why the discount rate moves commercial lease NPV and how to keep the assumption visible beside the terms.",
        "mainEntityOfPage": "/discount-rate-sensitivity#webpage"
      }
    ]
  },
  "/tenant-improvement-allowance": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-improvement-allowance#webpage",
        "name": "Tenant improvement allowance and occupancy cost",
        "url": "/tenant-improvement-allowance",
        "description": "How a tenant improvement allowance changes effective occupancy cost, and why it belongs in a lease comparison.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Tenant improvement allowance and occupancy cost",
            "item": "/tenant-improvement-allowance"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Tenant improvement allowance and occupancy cost",
        "description": "How a tenant improvement allowance changes effective occupancy cost, and why it belongs in a lease comparison.",
        "mainEntityOfPage": "/tenant-improvement-allowance#webpage"
      }
    ]
  },
  "/resources/cam-costs": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/resources/cam-costs#webpage",
        "name": "What is CAM in a commercial lease?",
        "url": "/resources/cam-costs",
        "description": "What CAM includes in a commercial lease, how it changes occupancy cost, and whether it belongs in lease NPV.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is CAM in a commercial lease?",
            "item": "/resources/cam-costs"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is CAM in a commercial lease?",
        "description": "What CAM includes in a commercial lease, how it changes occupancy cost, and whether it belongs in lease NPV.",
        "mainEntityOfPage": "/resources/cam-costs#webpage"
      }
    ]
  },
  "/resources/free-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/resources/free-rent#webpage",
        "name": "How free rent changes occupancy cost",
        "url": "/resources/free-rent",
        "description": "How free rent is structured, why timing matters, and how abatements change occupancy cost and NPV.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How free rent changes occupancy cost",
            "item": "/resources/free-rent"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How free rent changes occupancy cost",
        "description": "How free rent is structured, why timing matters, and how abatements change occupancy cost and NPV.",
        "mainEntityOfPage": "/resources/free-rent#webpage"
      }
    ]
  },
  "/resources/rent-escalations": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/resources/rent-escalations#webpage",
        "name": "How rent escalations change a lease comparison",
        "url": "/resources/rent-escalations",
        "description": "How fixed and percentage rent escalations change occupancy cost, NPV, and lease rankings.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How rent escalations change a lease comparison",
            "item": "/resources/rent-escalations"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How rent escalations change a lease comparison",
        "description": "How fixed and percentage rent escalations change occupancy cost, NPV, and lease rankings.",
        "mainEntityOfPage": "/resources/rent-escalations#webpage"
      }
    ]
  },
  "/early-access": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/early-access#webpage",
        "name": "Request Pilot Access",
        "url": "/early-access",
        "description": "Request a validation pilot for the proposed commercial lease comparison workflow. No payment is collected.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Request Pilot Access",
            "item": "/early-access"
          }
        ]
      }
    ]
  },
  "/resources/gross-vs-net-lease": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/resources/gross-vs-net-lease#webpage",
        "name": "Gross lease vs net lease",
        "url": "/resources/gross-vs-net-lease",
        "description": "The difference between gross, modified gross, and net leases, and why face rent alone can mislead.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Gross lease vs net lease",
            "item": "/resources/gross-vs-net-lease"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Gross lease vs net lease",
        "description": "The difference between gross, modified gross, and net leases, and why face rent alone can mislead.",
        "mainEntityOfPage": "/resources/gross-vs-net-lease#webpage"
      }
    ]
  },
  "/faq": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/faq#webpage",
        "name": "Questions about this lease comparison pilot",
        "url": "/faq",
        "description": "Direct answers about this early-validation lease comparison concept, pricing hypotheses, and what is not claimed.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Resources",
            "item": "/resources"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Questions about this lease comparison pilot",
            "item": "/faq"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is this a finished product?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. This is an early validation / pilot concept and is not generally available."
            }
          },
          {
            "@type": "Question",
            "name": "Is payment collected here?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Pricing shown is a hypothesis. A form selection indicates interest only."
            }
          },
          {
            "@type": "Question",
            "name": "Are the sample lease numbers customer results?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Tables and NPV figures are illustrative samples, not customer data."
            }
          }
        ]
      }
    ]
  },
  "/privacy-policy": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/privacy-policy#webpage",
        "name": "Privacy Policy",
        "url": "/privacy-policy",
        "description": "What this public validation site collects and what it does not collect.",
        "isPartOf": {
          "@id": "/#website"
        }
      }
    ]
  },
  "/terms-of-service": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/terms-of-service#webpage",
        "name": "Terms of Service",
        "url": "/terms-of-service",
        "description": "Terms for this early-access commercial lease comparison validation site.",
        "isPartOf": {
          "@id": "/#website"
        }
      }
    ]
  },
  "/commercial-lease-npv/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/#webpage",
        "name": "Commercial lease NPV",
        "url": "/commercial-lease-npv/",
        "description": "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Commercial lease NPV",
            "item": "/commercial-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Commercial lease NPV",
        "description": "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
        "mainEntityOfPage": "/commercial-lease-npv/#webpage"
      }
    ]
  },
  "/lease-comparison": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/#webpage",
        "name": "Lease comparison",
        "url": "/lease-comparison/",
        "description": "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease comparison",
            "item": "/lease-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease comparison",
        "description": "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
        "mainEntityOfPage": "/lease-comparison/#webpage"
      }
    ]
  },
  "/lease-comparison/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/#webpage",
        "name": "Lease comparison",
        "url": "/lease-comparison/",
        "description": "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease comparison",
            "item": "/lease-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease comparison",
        "description": "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
        "mainEntityOfPage": "/lease-comparison/#webpage"
      }
    ]
  },
  "/effective-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/#webpage",
        "name": "Effective rent",
        "url": "/effective-rent/",
        "description": "Effective rent averages a lease into one number. Learn what it includes, what it hides, and how it differs from NPV.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent",
            "item": "/effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent",
        "description": "Effective rent averages a lease into one number. Learn what it includes, what it hides, and how it differs from NPV.",
        "mainEntityOfPage": "/effective-rent/#webpage"
      }
    ]
  },
  "/effective-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/#webpage",
        "name": "Effective rent",
        "url": "/effective-rent/",
        "description": "Effective rent averages a lease into one number. Learn what it includes, what it hides, and how it differs from NPV.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent",
            "item": "/effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent",
        "description": "Effective rent averages a lease into one number. Learn what it includes, what it hides, and how it differs from NPV.",
        "mainEntityOfPage": "/effective-rent/#webpage"
      }
    ]
  },
  "/occupancy-costs": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/#webpage",
        "name": "Occupancy costs",
        "url": "/occupancy-costs/",
        "description": "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy costs",
            "item": "/occupancy-costs/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy costs",
        "description": "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
        "mainEntityOfPage": "/occupancy-costs/#webpage"
      }
    ]
  },
  "/occupancy-costs/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/#webpage",
        "name": "Occupancy costs",
        "url": "/occupancy-costs/",
        "description": "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy costs",
            "item": "/occupancy-costs/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy costs",
        "description": "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
        "mainEntityOfPage": "/occupancy-costs/#webpage"
      }
    ]
  },
  "/lease-sensitivity-analysis": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/#webpage",
        "name": "Lease sensitivity analysis",
        "url": "/lease-sensitivity-analysis/",
        "description": "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease sensitivity analysis",
            "item": "/lease-sensitivity-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease sensitivity analysis",
        "description": "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/#webpage"
      }
    ]
  },
  "/lease-sensitivity-analysis/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/#webpage",
        "name": "Lease sensitivity analysis",
        "url": "/lease-sensitivity-analysis/",
        "description": "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease sensitivity analysis",
            "item": "/lease-sensitivity-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease sensitivity analysis",
        "description": "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/#webpage"
      }
    ]
  },
  "/tenant-rep-analysis": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/#webpage",
        "name": "Tenant-rep analysis",
        "url": "/tenant-rep-analysis/",
        "description": "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Tenant-rep analysis",
            "item": "/tenant-rep-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Tenant-rep analysis",
        "description": "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
        "mainEntityOfPage": "/tenant-rep-analysis/#webpage"
      }
    ]
  },
  "/tenant-rep-analysis/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/#webpage",
        "name": "Tenant-rep analysis",
        "url": "/tenant-rep-analysis/",
        "description": "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Tenant-rep analysis",
            "item": "/tenant-rep-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Tenant-rep analysis",
        "description": "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
        "mainEntityOfPage": "/tenant-rep-analysis/#webpage"
      }
    ]
  },
  "/lease-financial-modeling": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/#webpage",
        "name": "Lease financial modeling",
        "url": "/lease-financial-modeling/",
        "description": "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease financial modeling",
            "item": "/lease-financial-modeling/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease financial modeling",
        "description": "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
        "mainEntityOfPage": "/lease-financial-modeling/#webpage"
      }
    ]
  },
  "/lease-financial-modeling/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/#webpage",
        "name": "Lease financial modeling",
        "url": "/lease-financial-modeling/",
        "description": "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease financial modeling",
            "item": "/lease-financial-modeling/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease financial modeling",
        "description": "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
        "mainEntityOfPage": "/lease-financial-modeling/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/#webpage",
        "name": "What is NPV in a commercial lease?",
        "url": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
        "description": "NPV turns later lease costs into today's dollars so you can compare options fairly. This page explains the idea with a worked example.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is NPV in a commercial lease?",
            "item": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is NPV in a commercial lease?",
        "description": "NPV turns later lease costs into today's dollars so you can compare options fairly. This page explains the idea with a worked example.",
        "mainEntityOfPage": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/#webpage",
        "name": "What is NPV in a commercial lease?",
        "url": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
        "description": "NPV turns later lease costs into today's dollars so you can compare options fairly. This page explains the idea with a worked example.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is NPV in a commercial lease?",
            "item": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is NPV in a commercial lease?",
        "description": "NPV turns later lease costs into today's dollars so you can compare options fairly. This page explains the idea with a worked example.",
        "mainEntityOfPage": "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/what-discount-rate-should-you-use": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-discount-rate-should-you-use/#webpage",
        "name": "What discount rate should you use?",
        "url": "/commercial-lease-npv/what-discount-rate-should-you-use/",
        "description": "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What discount rate should you use?",
            "item": "/commercial-lease-npv/what-discount-rate-should-you-use/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What discount rate should you use?",
        "description": "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
        "mainEntityOfPage": "/commercial-lease-npv/what-discount-rate-should-you-use/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/what-discount-rate-should-you-use/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-discount-rate-should-you-use/#webpage",
        "name": "What discount rate should you use?",
        "url": "/commercial-lease-npv/what-discount-rate-should-you-use/",
        "description": "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What discount rate should you use?",
            "item": "/commercial-lease-npv/what-discount-rate-should-you-use/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What discount rate should you use?",
        "description": "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
        "mainEntityOfPage": "/commercial-lease-npv/what-discount-rate-should-you-use/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/when-is-npv-the-wrong-metric": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/when-is-npv-the-wrong-metric/#webpage",
        "name": "When is NPV the wrong metric?",
        "url": "/commercial-lease-npv/when-is-npv-the-wrong-metric/",
        "description": "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "When is NPV the wrong metric?",
            "item": "/commercial-lease-npv/when-is-npv-the-wrong-metric/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "When is NPV the wrong metric?",
        "description": "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
        "mainEntityOfPage": "/commercial-lease-npv/when-is-npv-the-wrong-metric/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/when-is-npv-the-wrong-metric/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/when-is-npv-the-wrong-metric/#webpage",
        "name": "When is NPV the wrong metric?",
        "url": "/commercial-lease-npv/when-is-npv-the-wrong-metric/",
        "description": "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "When is NPV the wrong metric?",
            "item": "/commercial-lease-npv/when-is-npv-the-wrong-metric/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "When is NPV the wrong metric?",
        "description": "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
        "mainEntityOfPage": "/commercial-lease-npv/when-is-npv-the-wrong-metric/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/#webpage",
        "name": "How do you compare two commercial lease options?",
        "url": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
        "description": "Put both leases on one timeline. Include rent, extras, credits, and start dates. Then discount the cash and read the result with care.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare two commercial lease options?",
            "item": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare two commercial lease options?",
        "description": "Put both leases on one timeline. Include rent, extras, credits, and start dates. Then discount the cash and read the result with care.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/#webpage",
        "name": "How do you compare two commercial lease options?",
        "url": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
        "description": "Put both leases on one timeline. Include rent, extras, credits, and start dates. Then discount the cash and read the result with care.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare two commercial lease options?",
            "item": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare two commercial lease options?",
        "description": "Put both leases on one timeline. Include rent, extras, credits, and start dates. Then discount the cash and read the result with care.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-two-commercial-lease-options/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/#webpage",
        "name": "How do free rent and TI allowances affect NPV?",
        "url": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/",
        "description": "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do free rent and TI allowances affect NPV?",
            "item": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do free rent and TI allowances affect NPV?",
        "description": "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
        "mainEntityOfPage": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/#webpage",
        "name": "How do free rent and TI allowances affect NPV?",
        "url": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/",
        "description": "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do free rent and TI allowances affect NPV?",
            "item": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do free rent and TI allowances affect NPV?",
        "description": "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
        "mainEntityOfPage": "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-different-lease-terms": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-different-lease-terms/#webpage",
        "name": "How do you compare different lease terms?",
        "url": "/lease-comparison/how-do-you-compare-different-lease-terms/",
        "description": "A five-year lease and a ten-year lease are not the same product. Learn how to compare them without pretending the extra years are free.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare different lease terms?",
            "item": "/lease-comparison/how-do-you-compare-different-lease-terms/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare different lease terms?",
        "description": "A five-year lease and a ten-year lease are not the same product. Learn how to compare them without pretending the extra years are free.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-different-lease-terms/#webpage"
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-different-lease-terms/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-different-lease-terms/#webpage",
        "name": "How do you compare different lease terms?",
        "url": "/lease-comparison/how-do-you-compare-different-lease-terms/",
        "description": "A five-year lease and a ten-year lease are not the same product. Learn how to compare them without pretending the extra years are free.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare different lease terms?",
            "item": "/lease-comparison/how-do-you-compare-different-lease-terms/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare different lease terms?",
        "description": "A five-year lease and a ten-year lease are not the same product. Learn how to compare them without pretending the extra years are free.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-different-lease-terms/#webpage"
      }
    ]
  },
  "/effective-rent/effective-rent-vs-npv": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-npv/#webpage",
        "name": "Effective rent vs NPV",
        "url": "/effective-rent/effective-rent-vs-npv/",
        "description": "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs NPV",
            "item": "/effective-rent/effective-rent-vs-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs NPV",
        "description": "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-npv/#webpage"
      }
    ]
  },
  "/effective-rent/effective-rent-vs-npv/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-npv/#webpage",
        "name": "Effective rent vs NPV",
        "url": "/effective-rent/effective-rent-vs-npv/",
        "description": "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs NPV",
            "item": "/effective-rent/effective-rent-vs-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs NPV",
        "description": "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-npv/#webpage"
      }
    ]
  },
  "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/#webpage",
        "name": "What does lease sensitivity analysis show?",
        "url": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/",
        "description": "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What does lease sensitivity analysis show?",
            "item": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What does lease sensitivity analysis show?",
        "description": "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/#webpage"
      }
    ]
  },
  "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/#webpage",
        "name": "What does lease sensitivity analysis show?",
        "url": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/",
        "description": "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What does lease sensitivity analysis show?",
            "item": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What does lease sensitivity analysis show?",
        "description": "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/#webpage"
      }
    ]
  },
  "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/#webpage",
        "name": "How should a tenant-rep broker explain lease economics?",
        "url": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/",
        "description": "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How should a tenant-rep broker explain lease economics?",
            "item": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How should a tenant-rep broker explain lease economics?",
        "description": "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/#webpage"
      }
    ]
  },
  "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/#webpage",
        "name": "How should a tenant-rep broker explain lease economics?",
        "url": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/",
        "description": "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How should a tenant-rep broker explain lease economics?",
            "item": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How should a tenant-rep broker explain lease economics?",
        "description": "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/#webpage"
      }
    ]
  },
  "/lease-financial-modeling/what-are-common-lease-analysis-mistakes": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/#webpage",
        "name": "What are common lease-analysis mistakes?",
        "url": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/",
        "description": "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What are common lease-analysis mistakes?",
            "item": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What are common lease-analysis mistakes?",
        "description": "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
        "mainEntityOfPage": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/#webpage"
      }
    ]
  },
  "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/#webpage",
        "name": "What are common lease-analysis mistakes?",
        "url": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/",
        "description": "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What are common lease-analysis mistakes?",
            "item": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What are common lease-analysis mistakes?",
        "description": "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
        "mainEntityOfPage": "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/#webpage"
      }
    ]
  },
  "/commercial-lease-npv/how-is-lease-npv-calculated": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/how-is-lease-npv-calculated/#webpage",
        "name": "How is lease NPV calculated?",
        "url": "/commercial-lease-npv/how-is-lease-npv-calculated/",
        "description": "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How is lease NPV calculated?",
            "item": "/commercial-lease-npv/how-is-lease-npv-calculated/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How is lease NPV calculated?",
        "description": "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values.",
        "mainEntityOfPage": "/commercial-lease-npv/how-is-lease-npv-calculated/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/how-is-lease-npv-calculated/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/how-is-lease-npv-calculated/#webpage",
        "name": "How is lease NPV calculated?",
        "url": "/commercial-lease-npv/how-is-lease-npv-calculated/",
        "description": "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How is lease NPV calculated?",
            "item": "/commercial-lease-npv/how-is-lease-npv-calculated/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How is lease NPV calculated?",
        "description": "Write the cash by year, subtract credits in the year they happen, pick one rate, and add the shrunk year values.",
        "mainEntityOfPage": "/commercial-lease-npv/how-is-lease-npv-calculated/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/what-costs-belong-in-lease-npv": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-costs-belong-in-lease-npv/#webpage",
        "name": "What costs belong in lease NPV?",
        "url": "/commercial-lease-npv/what-costs-belong-in-lease-npv/",
        "description": "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What costs belong in lease NPV?",
            "item": "/commercial-lease-npv/what-costs-belong-in-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What costs belong in lease NPV?",
        "description": "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline.",
        "mainEntityOfPage": "/commercial-lease-npv/what-costs-belong-in-lease-npv/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/what-costs-belong-in-lease-npv/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/what-costs-belong-in-lease-npv/#webpage",
        "name": "What costs belong in lease NPV?",
        "url": "/commercial-lease-npv/what-costs-belong-in-lease-npv/",
        "description": "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What costs belong in lease NPV?",
            "item": "/commercial-lease-npv/what-costs-belong-in-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What costs belong in lease NPV?",
        "description": "Rent is not the whole list. CAM, tax, insurance, free rent, and build-out money belong on the same timeline.",
        "mainEntityOfPage": "/commercial-lease-npv/what-costs-belong-in-lease-npv/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/npv-vs-present-value": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/npv-vs-present-value/#webpage",
        "name": "NPV vs present value",
        "url": "/commercial-lease-npv/npv-vs-present-value/",
        "description": "Present value shrinks one later cash event. NPV adds every shrunk event on the lease timeline.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "NPV vs present value",
            "item": "/commercial-lease-npv/npv-vs-present-value/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "NPV vs present value",
        "description": "Present value shrinks one later cash event. NPV adds every shrunk event on the lease timeline.",
        "mainEntityOfPage": "/commercial-lease-npv/npv-vs-present-value/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/npv-vs-present-value/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/npv-vs-present-value/#webpage",
        "name": "NPV vs present value",
        "url": "/commercial-lease-npv/npv-vs-present-value/",
        "description": "Present value shrinks one later cash event. NPV adds every shrunk event on the lease timeline.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "NPV vs present value",
            "item": "/commercial-lease-npv/npv-vs-present-value/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "NPV vs present value",
        "description": "Present value shrinks one later cash event. NPV adds every shrunk event on the lease timeline.",
        "mainEntityOfPage": "/commercial-lease-npv/npv-vs-present-value/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/how-to-explain-lease-npv-to-clients": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/#webpage",
        "name": "How to explain lease NPV to clients",
        "url": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/",
        "description": "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to explain lease NPV to clients",
            "item": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to explain lease NPV to clients",
        "description": "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used.",
        "mainEntityOfPage": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/#webpage",
        "name": "How to explain lease NPV to clients",
        "url": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/",
        "description": "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to explain lease NPV to clients",
            "item": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to explain lease NPV to clients",
        "description": "Tell the client this is the price of the deal in today's dollars, then show the cash years and the rate you used.",
        "mainEntityOfPage": "/commercial-lease-npv/how-to-explain-lease-npv-to-clients/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV on a lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits."
            }
          },
          {
            "@type": "Question",
            "name": "Is lower NPV always better?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number."
            }
          },
          {
            "@type": "Question",
            "name": "What costs belong in the walk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-you-normalize-commercial-lease-proposals": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/#webpage",
        "name": "How do you normalize commercial lease proposals?",
        "url": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/",
        "description": "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you normalize commercial lease proposals?",
            "item": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you normalize commercial lease proposals?",
        "description": "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/#webpage",
        "name": "How do you normalize commercial lease proposals?",
        "url": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/",
        "description": "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you normalize commercial lease proposals?",
            "item": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you normalize commercial lease proposals?",
        "description": "Put every offer on the same unit: all-in cost, same dates, same extras. Then the face rent can stop running the meeting.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-gross-and-net-leases": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-gross-and-net-leases/#webpage",
        "name": "How do you compare gross and net leases?",
        "url": "/lease-comparison/how-do-you-compare-gross-and-net-leases/",
        "description": "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare gross and net leases?",
            "item": "/lease-comparison/how-do-you-compare-gross-and-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare gross and net leases?",
        "description": "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-gross-and-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-you-compare-gross-and-net-leases/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-you-compare-gross-and-net-leases/#webpage",
        "name": "How do you compare gross and net leases?",
        "url": "/lease-comparison/how-do-you-compare-gross-and-net-leases/",
        "description": "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do you compare gross and net leases?",
            "item": "/lease-comparison/how-do-you-compare-gross-and-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do you compare gross and net leases?",
        "description": "A lower net face rent can cost more after CAM, tax, and insurance. Convert both offers to one occupancy-cost stack.",
        "mainEntityOfPage": "/lease-comparison/how-do-you-compare-gross-and-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/what-belongs-in-a-commercial-lease-comparison": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/#webpage",
        "name": "What belongs in a commercial lease comparison?",
        "url": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/",
        "description": "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a commercial lease comparison?",
            "item": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a commercial lease comparison?",
        "description": "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip.",
        "mainEntityOfPage": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/#webpage",
        "name": "What belongs in a commercial lease comparison?",
        "url": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/",
        "description": "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a commercial lease comparison?",
            "item": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a commercial lease comparison?",
        "description": "Term, dates, rent, extras, credits, options, and the rate you used. Leave one out and the rank can flip.",
        "mainEntityOfPage": "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-brokers-compare-lease-offers": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-brokers-compare-lease-offers/#webpage",
        "name": "How do brokers compare lease offers?",
        "url": "/lease-comparison/how-do-brokers-compare-lease-offers/",
        "description": "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do brokers compare lease offers?",
            "item": "/lease-comparison/how-do-brokers-compare-lease-offers/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do brokers compare lease offers?",
        "description": "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client.",
        "mainEntityOfPage": "/lease-comparison/how-do-brokers-compare-lease-offers/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-brokers-compare-lease-offers/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-brokers-compare-lease-offers/#webpage",
        "name": "How do brokers compare lease offers?",
        "url": "/lease-comparison/how-do-brokers-compare-lease-offers/",
        "description": "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How do brokers compare lease offers?",
            "item": "/lease-comparison/how-do-brokers-compare-lease-offers/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How do brokers compare lease offers?",
        "description": "Brokers put both stacks on one timeline, discount the cash, and keep the assumptions visible for the client.",
        "mainEntityOfPage": "/lease-comparison/how-do-brokers-compare-lease-offers/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare two offers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate."
            }
          },
          {
            "@type": "Question",
            "name": "How do you normalize proposals?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare gross and net?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/how-to-calculate-effective-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/how-to-calculate-effective-rent/#webpage",
        "name": "How to calculate effective rent",
        "url": "/effective-rent/how-to-calculate-effective-rent/",
        "description": "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to calculate effective rent",
            "item": "/effective-rent/how-to-calculate-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to calculate effective rent",
        "description": "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting.",
        "mainEntityOfPage": "/effective-rent/how-to-calculate-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/how-to-calculate-effective-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/how-to-calculate-effective-rent/#webpage",
        "name": "How to calculate effective rent",
        "url": "/effective-rent/how-to-calculate-effective-rent/",
        "description": "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to calculate effective rent",
            "item": "/effective-rent/how-to-calculate-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to calculate effective rent",
        "description": "Add the rent you pay. Subtract credits. Spread the result across the term. A better method also prices waiting.",
        "mainEntityOfPage": "/effective-rent/how-to-calculate-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-vs-face-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-face-rent/#webpage",
        "name": "Effective rent vs face rent",
        "url": "/effective-rent/effective-rent-vs-face-rent/",
        "description": "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs face rent",
            "item": "/effective-rent/effective-rent-vs-face-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs face rent",
        "description": "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-face-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-vs-face-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-face-rent/#webpage",
        "name": "Effective rent vs face rent",
        "url": "/effective-rent/effective-rent-vs-face-rent/",
        "description": "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs face rent",
            "item": "/effective-rent/effective-rent-vs-face-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs face rent",
        "description": "Face rent is the sticker. Effective rent folds in free months, build-out money, and the rest of the deal.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-face-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-per-square-foot": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-per-square-foot/#webpage",
        "name": "Effective rent per square foot",
        "url": "/effective-rent/effective-rent-per-square-foot/",
        "description": "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent per square foot",
            "item": "/effective-rent/effective-rent-per-square-foot/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent per square foot",
        "description": "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.",
        "mainEntityOfPage": "/effective-rent/effective-rent-per-square-foot/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-per-square-foot/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-per-square-foot/#webpage",
        "name": "Effective rent per square foot",
        "url": "/effective-rent/effective-rent-per-square-foot/",
        "description": "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent per square foot",
            "item": "/effective-rent/effective-rent-per-square-foot/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent per square foot",
        "description": "Turn the whole deal into one yearly dollar per foot so two buildings can sit on the same scale.",
        "mainEntityOfPage": "/effective-rent/effective-rent-per-square-foot/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/common-effective-rent-mistakes": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/common-effective-rent-mistakes/#webpage",
        "name": "Common effective rent mistakes",
        "url": "/effective-rent/common-effective-rent-mistakes/",
        "description": "People forget credits, mix gross and net, or treat a simple average as if it priced time.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Common effective rent mistakes",
            "item": "/effective-rent/common-effective-rent-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Common effective rent mistakes",
        "description": "People forget credits, mix gross and net, or treat a simple average as if it priced time.",
        "mainEntityOfPage": "/effective-rent/common-effective-rent-mistakes/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/common-effective-rent-mistakes/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/common-effective-rent-mistakes/#webpage",
        "name": "Common effective rent mistakes",
        "url": "/effective-rent/common-effective-rent-mistakes/",
        "description": "People forget credits, mix gross and net, or treat a simple average as if it priced time.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Common effective rent mistakes",
            "item": "/effective-rent/common-effective-rent-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Common effective rent mistakes",
        "description": "People forget credits, mix gross and net, or treat a simple average as if it priced time.",
        "mainEntityOfPage": "/effective-rent/common-effective-rent-mistakes/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras."
            }
          },
          {
            "@type": "Question",
            "name": "How do you calculate it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare. A tenant should keep this lease answer visible on the same page."
            }
          },
          {
            "@type": "Question",
            "name": "How is it different from face rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/what-is-total-occupancy-cost": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/what-is-total-occupancy-cost/#webpage",
        "name": "What is total occupancy cost?",
        "url": "/occupancy-costs/what-is-total-occupancy-cost/",
        "description": "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is total occupancy cost?",
            "item": "/occupancy-costs/what-is-total-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is total occupancy cost?",
        "description": "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.",
        "mainEntityOfPage": "/occupancy-costs/what-is-total-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/what-is-total-occupancy-cost/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/what-is-total-occupancy-cost/#webpage",
        "name": "What is total occupancy cost?",
        "url": "/occupancy-costs/what-is-total-occupancy-cost/",
        "description": "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is total occupancy cost?",
            "item": "/occupancy-costs/what-is-total-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is total occupancy cost?",
        "description": "Occupancy cost is rent plus the extras you still pay to sit in the space: CAM, tax, insurance, and more.",
        "mainEntityOfPage": "/occupancy-costs/what-is-total-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/what-is-cam-in-a-commercial-lease": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/what-is-cam-in-a-commercial-lease/#webpage",
        "name": "What is CAM in a commercial lease?",
        "url": "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
        "description": "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is CAM in a commercial lease?",
            "item": "/occupancy-costs/what-is-cam-in-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is CAM in a commercial lease?",
        "description": "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.",
        "mainEntityOfPage": "/occupancy-costs/what-is-cam-in-a-commercial-lease/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/what-is-cam-in-a-commercial-lease/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/what-is-cam-in-a-commercial-lease/#webpage",
        "name": "What is CAM in a commercial lease?",
        "url": "/occupancy-costs/what-is-cam-in-a-commercial-lease/",
        "description": "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is CAM in a commercial lease?",
            "item": "/occupancy-costs/what-is-cam-in-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is CAM in a commercial lease?",
        "description": "CAM means common area maintenance. It is your share of shared building cost, billed as an estimate and trued up later.",
        "mainEntityOfPage": "/occupancy-costs/what-is-cam-in-a-commercial-lease/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/hidden-occupancy-costs": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/hidden-occupancy-costs/#webpage",
        "name": "Hidden occupancy costs",
        "url": "/occupancy-costs/hidden-occupancy-costs/",
        "description": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Hidden occupancy costs",
            "item": "/occupancy-costs/hidden-occupancy-costs/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Hidden occupancy costs",
        "description": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.",
        "mainEntityOfPage": "/occupancy-costs/hidden-occupancy-costs/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/hidden-occupancy-costs/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/hidden-occupancy-costs/#webpage",
        "name": "Hidden occupancy costs",
        "url": "/occupancy-costs/hidden-occupancy-costs/",
        "description": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Hidden occupancy costs",
            "item": "/occupancy-costs/hidden-occupancy-costs/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Hidden occupancy costs",
        "description": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend can raise the bill far above face rent.",
        "mainEntityOfPage": "/occupancy-costs/hidden-occupancy-costs/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/occupancy-cost-per-square-foot": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/occupancy-cost-per-square-foot/#webpage",
        "name": "Occupancy cost per square foot",
        "url": "/occupancy-costs/occupancy-cost-per-square-foot/",
        "description": "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy cost per square foot",
            "item": "/occupancy-costs/occupancy-cost-per-square-foot/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy cost per square foot",
        "description": "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.",
        "mainEntityOfPage": "/occupancy-costs/occupancy-cost-per-square-foot/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/occupancy-cost-per-square-foot/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/occupancy-cost-per-square-foot/#webpage",
        "name": "Occupancy cost per square foot",
        "url": "/occupancy-costs/occupancy-cost-per-square-foot/",
        "description": "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy cost per square foot",
            "item": "/occupancy-costs/occupancy-cost-per-square-foot/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy cost per square foot",
        "description": "Divide the full yearly stack by the feet you pay for. Use the same foot basis on every option.",
        "mainEntityOfPage": "/occupancy-costs/occupancy-cost-per-square-foot/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is total occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance."
            }
          },
          {
            "@type": "Question",
            "name": "What is CAM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow."
            }
          },
          {
            "@type": "Question",
            "name": "What hidden costs do tenants miss?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/#webpage",
        "name": "Why use lease sensitivity analysis?",
        "url": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/",
        "description": "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why use lease sensitivity analysis?",
            "item": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why use lease sensitivity analysis?",
        "description": "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/#webpage",
        "name": "Why use lease sensitivity analysis?",
        "url": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/",
        "description": "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why use lease sensitivity analysis?",
            "item": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why use lease sensitivity analysis?",
        "description": "A ranking can flip when one assumption moves. Sensitivity shows which number actually drives the choice.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/#webpage",
        "name": "How discount-rate sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/",
        "description": "A one or two point rate change can swap the winner when credits sit early and rent sits late.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How discount-rate sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How discount-rate sensitivity changes a ranking",
        "description": "A one or two point rate change can swap the winner when credits sit early and rent sits late.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/#webpage",
        "name": "How discount-rate sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/",
        "description": "A one or two point rate change can swap the winner when credits sit early and rent sits late.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How discount-rate sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How discount-rate sensitivity changes a ranking",
        "description": "A one or two point rate change can swap the winner when credits sit early and rent sits late.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/#webpage",
        "name": "How to present lease scenarios to a CFO",
        "url": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/",
        "description": "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to present lease scenarios to a CFO",
            "item": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to present lease scenarios to a CFO",
        "description": "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/#webpage",
        "name": "How to present lease scenarios to a CFO",
        "url": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/",
        "description": "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to present lease scenarios to a CFO",
            "item": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to present lease scenarios to a CFO",
        "description": "Show the base case, one worse case, and the assumption that flips the rank. Keep the rate in the open.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What does sensitivity show?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted."
            }
          },
          {
            "@type": "Question",
            "name": "Why use it?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little."
            }
          },
          {
            "@type": "Question",
            "name": "How does the rate change a rank?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/#webpage",
        "name": "How tenant-rep brokers compare LOIs",
        "url": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/",
        "description": "An LOI is a sketch. Rebuild each sketch as cash, extras, and credits before you pick a winner.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How tenant-rep brokers compare LOIs",
            "item": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How tenant-rep brokers compare LOIs",
        "description": "An LOI is a sketch. Rebuild each sketch as cash, extras, and credits before you pick a winner.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/#webpage",
        "name": "How tenant-rep brokers compare LOIs",
        "url": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/",
        "description": "An LOI is a sketch. Rebuild each sketch as cash, extras, and credits before you pick a winner.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How tenant-rep brokers compare LOIs",
            "item": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How tenant-rep brokers compare LOIs",
        "description": "An LOI is a sketch. Rebuild each sketch as cash, extras, and credits before you pick a winner.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/#webpage",
        "name": "What belongs in a lease recommendation memo?",
        "url": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/",
        "description": "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a lease recommendation memo?",
            "item": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a lease recommendation memo?",
        "description": "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.",
        "mainEntityOfPage": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/#webpage",
        "name": "What belongs in a lease recommendation memo?",
        "url": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/",
        "description": "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a lease recommendation memo?",
            "item": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a lease recommendation memo?",
        "description": "State the pick, the gap, the assumptions, the risks, and the next ask. Hide none of those.",
        "mainEntityOfPage": "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/#webpage",
        "name": "How to compare renewal vs relocation",
        "url": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/",
        "description": "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to compare renewal vs relocation",
            "item": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to compare renewal vs relocation",
        "description": "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/#webpage",
        "name": "How to compare renewal vs relocation",
        "url": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/",
        "description": "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to compare renewal vs relocation",
            "item": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to compare renewal vs relocation",
        "description": "Stay-versus-move is still a lease comparison. Add move cost, downtime, and the value of staying put.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-to-compare-renewal-vs-relocation/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a broker explain economics?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward."
            }
          },
          {
            "@type": "Question",
            "name": "How do you compare LOIs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner."
            }
          },
          {
            "@type": "Question",
            "name": "What belongs in the memo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/#webpage",
        "name": "What inputs belong in a commercial lease model?",
        "url": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/",
        "description": "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What inputs belong in a commercial lease model?",
            "item": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What inputs belong in a commercial lease model?",
        "description": "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.",
        "mainEntityOfPage": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What inputs belong in the model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs."
            }
          },
          {
            "@type": "Question",
            "name": "How do you build the cash list?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash-flow model places one lease row per period and links every money cell back to an input."
            }
          },
          {
            "@type": "Question",
            "name": "What mistakes show up first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/#webpage",
        "name": "What inputs belong in a commercial lease model?",
        "url": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/",
        "description": "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What inputs belong in a commercial lease model?",
            "item": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What inputs belong in a commercial lease model?",
        "description": "Dates, rent steps, extras, credits, and the rate. A missing date can lie louder than a wrong formula.",
        "mainEntityOfPage": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What inputs belong in the model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs."
            }
          },
          {
            "@type": "Question",
            "name": "How do you build the cash list?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash-flow model places one lease row per period and links every money cell back to an input."
            }
          },
          {
            "@type": "Question",
            "name": "What mistakes show up first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/#webpage",
        "name": "How to build a lease cash-flow model",
        "url": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/",
        "description": "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to build a lease cash-flow model",
            "item": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to build a lease cash-flow model",
        "description": "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What inputs belong in the model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs."
            }
          },
          {
            "@type": "Question",
            "name": "How do you build the cash list?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash-flow model places one lease row per period and links every money cell back to an input."
            }
          },
          {
            "@type": "Question",
            "name": "What mistakes show up first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/#webpage",
        "name": "How to build a lease cash-flow model",
        "url": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/",
        "description": "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to build a lease cash-flow model",
            "item": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to build a lease cash-flow model",
        "description": "List cash in and out by period. Keep inputs on one sheet. Then discount the stream and test nearby cases.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What inputs belong in the model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs."
            }
          },
          {
            "@type": "Question",
            "name": "How do you build the cash list?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash-flow model places one lease row per period and links every money cell back to an input."
            }
          },
          {
            "@type": "Question",
            "name": "What mistakes show up first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/why-use-npv-when-comparing-leases": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/why-use-npv-when-comparing-leases/#webpage",
        "name": "Why use NPV when comparing leases?",
        "url": "/commercial-lease-npv/why-use-npv-when-comparing-leases/",
        "description": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why use NPV when comparing leases?",
            "item": "/commercial-lease-npv/why-use-npv-when-comparing-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why use NPV when comparing leases?",
        "description": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.",
        "mainEntityOfPage": "/commercial-lease-npv/why-use-npv-when-comparing-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV when comparing commercial leases?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/why-use-npv-when-comparing-leases/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/why-use-npv-when-comparing-leases/#webpage",
        "name": "Why use NPV when comparing leases?",
        "url": "/commercial-lease-npv/why-use-npv-when-comparing-leases/",
        "description": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why use NPV when comparing leases?",
            "item": "/commercial-lease-npv/why-use-npv-when-comparing-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why use NPV when comparing leases?",
        "description": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year.",
        "mainEntityOfPage": "/commercial-lease-npv/why-use-npv-when-comparing-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why use NPV when comparing commercial leases?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "NPV puts two pay schedules in today's dollars so a later rent step does not hide behind a cheap first year."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/npv-vs-total-lease-cost": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/npv-vs-total-lease-cost/#webpage",
        "name": "NPV vs total lease cost",
        "url": "/commercial-lease-npv/npv-vs-total-lease-cost/",
        "description": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "NPV vs total lease cost",
            "item": "/commercial-lease-npv/npv-vs-total-lease-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "NPV vs total lease cost",
        "description": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently.",
        "mainEntityOfPage": "/commercial-lease-npv/npv-vs-total-lease-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why do NPV and total lease cost differ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/npv-vs-total-lease-cost/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/npv-vs-total-lease-cost/#webpage",
        "name": "NPV vs total lease cost",
        "url": "/commercial-lease-npv/npv-vs-total-lease-cost/",
        "description": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "NPV vs total lease cost",
            "item": "/commercial-lease-npv/npv-vs-total-lease-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "NPV vs total lease cost",
        "description": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently.",
        "mainEntityOfPage": "/commercial-lease-npv/npv-vs-total-lease-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why do NPV and total lease cost differ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Total cash adds every year at face value. NPV shrinks later years, so two equal sums can still rank differently."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/should-cam-be-in-lease-npv": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/should-cam-be-in-lease-npv/#webpage",
        "name": "Should CAM be in lease NPV?",
        "url": "/commercial-lease-npv/should-cam-be-in-lease-npv/",
        "description": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Should CAM be in lease NPV?",
            "item": "/commercial-lease-npv/should-cam-be-in-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Should CAM be in lease NPV?",
        "description": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.",
        "mainEntityOfPage": "/commercial-lease-npv/should-cam-be-in-lease-npv/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Should CAM be included in lease NPV?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits."
            }
          }
        ]
      }
    ]
  },
  "/commercial-lease-npv/should-cam-be-in-lease-npv/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/commercial-lease-npv/should-cam-be-in-lease-npv/#webpage",
        "name": "Should CAM be in lease NPV?",
        "url": "/commercial-lease-npv/should-cam-be-in-lease-npv/",
        "description": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/commercial-lease-npv"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Should CAM be in lease NPV?",
            "item": "/commercial-lease-npv/should-cam-be-in-lease-npv/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Should CAM be in lease NPV?",
        "description": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits.",
        "mainEntityOfPage": "/commercial-lease-npv/should-cam-be-in-lease-npv/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Should CAM be included in lease NPV?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "If the tenant pays common-area cost, those dollars belong on the same NPV walk as rent and credits."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-cfos-review-lease-comparisons": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-cfos-review-lease-comparisons/#webpage",
        "name": "How CFOs review lease comparisons",
        "url": "/lease-comparison/how-do-cfos-review-lease-comparisons/",
        "description": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CFOs review lease comparisons",
            "item": "/lease-comparison/how-do-cfos-review-lease-comparisons/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CFOs review lease comparisons",
        "description": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.",
        "mainEntityOfPage": "/lease-comparison/how-do-cfos-review-lease-comparisons/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CFOs review commercial lease comparisons?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-cfos-review-lease-comparisons/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-cfos-review-lease-comparisons/#webpage",
        "name": "How CFOs review lease comparisons",
        "url": "/lease-comparison/how-do-cfos-review-lease-comparisons/",
        "description": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CFOs review lease comparisons",
            "item": "/lease-comparison/how-do-cfos-review-lease-comparisons/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CFOs review lease comparisons",
        "description": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner.",
        "mainEntityOfPage": "/lease-comparison/how-do-cfos-review-lease-comparisons/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CFOs review commercial lease comparisons?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Finance wants one rate, one occupancy stack, and a nearby worse case before anyone names a winner."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-cam-charges-change-a-comparison": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-cam-charges-change-a-comparison/#webpage",
        "name": "How CAM charges change a comparison",
        "url": "/lease-comparison/how-do-cam-charges-change-a-comparison/",
        "description": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM charges change a comparison",
            "item": "/lease-comparison/how-do-cam-charges-change-a-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM charges change a comparison",
        "description": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less.",
        "mainEntityOfPage": "/lease-comparison/how-do-cam-charges-change-a-comparison/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CAM charges change a lease comparison?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/how-do-cam-charges-change-a-comparison/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/how-do-cam-charges-change-a-comparison/#webpage",
        "name": "How CAM charges change a comparison",
        "url": "/lease-comparison/how-do-cam-charges-change-a-comparison/",
        "description": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM charges change a comparison",
            "item": "/lease-comparison/how-do-cam-charges-change-a-comparison/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM charges change a comparison",
        "description": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less.",
        "mainEntityOfPage": "/lease-comparison/how-do-cam-charges-change-a-comparison/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CAM charges change a lease comparison?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A net rent sticker is not the bill. CAM, true-ups, and caps can flip which offer costs less."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/#webpage",
        "name": "Questions to ask before signing a lease",
        "url": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/",
        "description": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Questions to ask before signing a lease",
            "item": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Questions to ask before signing a lease",
        "description": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill.",
        "mainEntityOfPage": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What questions should a business ask before signing a commercial lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill."
            }
          }
        ]
      }
    ]
  },
  "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/#webpage",
        "name": "Questions to ask before signing a lease",
        "url": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/",
        "description": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-comparison"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Questions to ask before signing a lease",
            "item": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Questions to ask before signing a lease",
        "description": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill.",
        "mainEntityOfPage": "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What questions should a business ask before signing a commercial lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ask about extras, credits, dates, options, and the rate before a sticker rent becomes a ten-year bill."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/what-is-effective-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/what-is-effective-rent/#webpage",
        "name": "What is effective rent?",
        "url": "/effective-rent/what-is-effective-rent/",
        "description": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is effective rent?",
            "item": "/effective-rent/what-is-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is effective rent?",
        "description": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story.",
        "mainEntityOfPage": "/effective-rent/what-is-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent in a commercial lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/what-is-effective-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/what-is-effective-rent/#webpage",
        "name": "What is effective rent?",
        "url": "/effective-rent/what-is-effective-rent/",
        "description": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is effective rent?",
            "item": "/effective-rent/what-is-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is effective rent?",
        "description": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story.",
        "mainEntityOfPage": "/effective-rent/what-is-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is effective rent in a commercial lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Effective rent is one yearly lease number after credits and extras, so a sticker rent is not the whole story."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/blended-rent-vs-effective-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/blended-rent-vs-effective-rent/#webpage",
        "name": "Blended rent vs effective rent",
        "url": "/effective-rent/blended-rent-vs-effective-rent/",
        "description": "Blended rent is a simple average. Effective rent should still say whether waiting was priced.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Blended rent vs effective rent",
            "item": "/effective-rent/blended-rent-vs-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Blended rent vs effective rent",
        "description": "Blended rent is a simple average. Effective rent should still say whether waiting was priced.",
        "mainEntityOfPage": "/effective-rent/blended-rent-vs-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is blended rent versus effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Blended rent is a simple average. Effective rent should still say whether waiting was priced."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/blended-rent-vs-effective-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/blended-rent-vs-effective-rent/#webpage",
        "name": "Blended rent vs effective rent",
        "url": "/effective-rent/blended-rent-vs-effective-rent/",
        "description": "Blended rent is a simple average. Effective rent should still say whether waiting was priced.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Blended rent vs effective rent",
            "item": "/effective-rent/blended-rent-vs-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Blended rent vs effective rent",
        "description": "Blended rent is a simple average. Effective rent should still say whether waiting was priced.",
        "mainEntityOfPage": "/effective-rent/blended-rent-vs-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is blended rent versus effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Blended rent is a simple average. Effective rent should still say whether waiting was priced."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-vs-asking-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-asking-rent/#webpage",
        "name": "Effective rent vs asking rent",
        "url": "/effective-rent/effective-rent-vs-asking-rent/",
        "description": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs asking rent",
            "item": "/effective-rent/effective-rent-vs-asking-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs asking rent",
        "description": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-asking-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between effective rent and asking rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-vs-asking-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-vs-asking-rent/#webpage",
        "name": "Effective rent vs asking rent",
        "url": "/effective-rent/effective-rent-vs-asking-rent/",
        "description": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent vs asking rent",
            "item": "/effective-rent/effective-rent-vs-asking-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent vs asking rent",
        "description": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number.",
        "mainEntityOfPage": "/effective-rent/effective-rent-vs-asking-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between effective rent and asking rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-on-gross-and-net-leases": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-on-gross-and-net-leases/#webpage",
        "name": "Effective rent on gross and net leases",
        "url": "/effective-rent/effective-rent-on-gross-and-net-leases/",
        "description": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent on gross and net leases",
            "item": "/effective-rent/effective-rent-on-gross-and-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent on gross and net leases",
        "description": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it.",
        "mainEntityOfPage": "/effective-rent/effective-rent-on-gross-and-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does effective rent work the same on gross and net leases?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/effective-rent-on-gross-and-net-leases/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/effective-rent-on-gross-and-net-leases/#webpage",
        "name": "Effective rent on gross and net leases",
        "url": "/effective-rent/effective-rent-on-gross-and-net-leases/",
        "description": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Effective rent on gross and net leases",
            "item": "/effective-rent/effective-rent-on-gross-and-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Effective rent on gross and net leases",
        "description": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it.",
        "mainEntityOfPage": "/effective-rent/effective-rent-on-gross-and-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does effective rent work the same on gross and net leases?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Only if both stacks sit on the same expense basis. A net sticker needs extras before you average it."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/simple-average-vs-npv-adjusted-effective-rent": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/#webpage",
        "name": "Simple average vs NPV-adjusted effective rent",
        "url": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/",
        "description": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Simple average vs NPV-adjusted effective rent",
            "item": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Simple average vs NPV-adjusted effective rent",
        "description": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more.",
        "mainEntityOfPage": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Should you use a simple average or an NPV-adjusted effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more."
            }
          }
        ]
      }
    ]
  },
  "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/#webpage",
        "name": "Simple average vs NPV-adjusted effective rent",
        "url": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/",
        "description": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/effective-rent"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Simple average vs NPV-adjusted effective rent",
            "item": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Simple average vs NPV-adjusted effective rent",
        "description": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more.",
        "mainEntityOfPage": "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Should you use a simple average or an NPV-adjusted effective rent?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-property-taxes-change-occupancy-cost": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-property-taxes-change-occupancy-cost/#webpage",
        "name": "How property taxes change occupancy cost",
        "url": "/occupancy-costs/how-property-taxes-change-occupancy-cost/",
        "description": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How property taxes change occupancy cost",
            "item": "/occupancy-costs/how-property-taxes-change-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How property taxes change occupancy cost",
        "description": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent.",
        "mainEntityOfPage": "/occupancy-costs/how-property-taxes-change-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do property taxes change occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-property-taxes-change-occupancy-cost/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-property-taxes-change-occupancy-cost/#webpage",
        "name": "How property taxes change occupancy cost",
        "url": "/occupancy-costs/how-property-taxes-change-occupancy-cost/",
        "description": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How property taxes change occupancy cost",
            "item": "/occupancy-costs/how-property-taxes-change-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How property taxes change occupancy cost",
        "description": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent.",
        "mainEntityOfPage": "/occupancy-costs/how-property-taxes-change-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do property taxes change occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "On many net leases the tenant pays a share of tax. A reassessed building can move the bill more than rent."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-insurance-changes-occupancy-cost": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-insurance-changes-occupancy-cost/#webpage",
        "name": "How insurance changes occupancy cost",
        "url": "/occupancy-costs/how-insurance-changes-occupancy-cost/",
        "description": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How insurance changes occupancy cost",
            "item": "/occupancy-costs/how-insurance-changes-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How insurance changes occupancy cost",
        "description": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing.",
        "mainEntityOfPage": "/occupancy-costs/how-insurance-changes-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does insurance change occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-insurance-changes-occupancy-cost/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-insurance-changes-occupancy-cost/#webpage",
        "name": "How insurance changes occupancy cost",
        "url": "/occupancy-costs/how-insurance-changes-occupancy-cost/",
        "description": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How insurance changes occupancy cost",
            "item": "/occupancy-costs/how-insurance-changes-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How insurance changes occupancy cost",
        "description": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing.",
        "mainEntityOfPage": "/occupancy-costs/how-insurance-changes-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does insurance change occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Building insurance is often passed through. A premium jump is occupancy cost, not a surprise fee after signing."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/base-rent-vs-occupancy-cost": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/base-rent-vs-occupancy-cost/#webpage",
        "name": "Base rent vs occupancy cost",
        "url": "/occupancy-costs/base-rent-vs-occupancy-cost/",
        "description": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Base rent vs occupancy cost",
            "item": "/occupancy-costs/base-rent-vs-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Base rent vs occupancy cost",
        "description": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras.",
        "mainEntityOfPage": "/occupancy-costs/base-rent-vs-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between base rent and occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/base-rent-vs-occupancy-cost/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/base-rent-vs-occupancy-cost/#webpage",
        "name": "Base rent vs occupancy cost",
        "url": "/occupancy-costs/base-rent-vs-occupancy-cost/",
        "description": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Base rent vs occupancy cost",
            "item": "/occupancy-costs/base-rent-vs-occupancy-cost/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Base rent vs occupancy cost",
        "description": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras.",
        "mainEntityOfPage": "/occupancy-costs/base-rent-vs-occupancy-cost/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between base rent and occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/#webpage",
        "name": "Occupancy cost on gross vs net leases",
        "url": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/",
        "description": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy cost on gross vs net leases",
            "item": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy cost on gross vs net leases",
        "description": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance.",
        "mainEntityOfPage": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare occupancy cost on a gross lease and a net lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/#webpage",
        "name": "Occupancy cost on gross vs net leases",
        "url": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/",
        "description": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Occupancy cost on gross vs net leases",
            "item": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Occupancy cost on gross vs net leases",
        "description": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance.",
        "mainEntityOfPage": "/occupancy-costs/occupancy-cost-on-gross-vs-net-leases/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare occupancy cost on a gross lease and a net lease?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/why-lowest-rent-can-cost-more": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/why-lowest-rent-can-cost-more/#webpage",
        "name": "Why the lowest rent can cost more",
        "url": "/occupancy-costs/why-lowest-rent-can-cost-more/",
        "description": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why the lowest rent can cost more",
            "item": "/occupancy-costs/why-lowest-rent-can-cost-more/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why the lowest rent can cost more",
        "description": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth.",
        "mainEntityOfPage": "/occupancy-costs/why-lowest-rent-can-cost-more/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why can the lowest rent option have a higher occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/why-lowest-rent-can-cost-more/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/why-lowest-rent-can-cost-more/#webpage",
        "name": "Why the lowest rent can cost more",
        "url": "/occupancy-costs/why-lowest-rent-can-cost-more/",
        "description": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Why the lowest rent can cost more",
            "item": "/occupancy-costs/why-lowest-rent-can-cost-more/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Why the lowest rent can cost more",
        "description": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth.",
        "mainEntityOfPage": "/occupancy-costs/why-lowest-rent-can-cost-more/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Why can the lowest rent option have a higher occupancy cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cheap sticker can hide uncapped CAM, tax, insurance, parking, or a weaker credit. The stack tells the truth."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/#webpage",
        "name": "How CAM caps change occupancy-cost risk",
        "url": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/",
        "description": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM caps change occupancy-cost risk",
            "item": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM caps change occupancy-cost risk",
        "description": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one.",
        "mainEntityOfPage": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CAM caps change occupancy-cost risk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one."
            }
          }
        ]
      }
    ]
  },
  "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/#webpage",
        "name": "How CAM caps change occupancy-cost risk",
        "url": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/",
        "description": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/occupancy-costs"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM caps change occupancy-cost risk",
            "item": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM caps change occupancy-cost risk",
        "description": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one.",
        "mainEntityOfPage": "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do CAM caps change occupancy-cost risk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/#webpage",
        "name": "Sensitivity vs scenario analysis",
        "url": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/",
        "description": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Sensitivity vs scenario analysis",
            "item": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Sensitivity vs scenario analysis",
        "description": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between sensitivity analysis and scenario analysis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/#webpage",
        "name": "Sensitivity vs scenario analysis",
        "url": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/",
        "description": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Sensitivity vs scenario analysis",
            "item": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Sensitivity vs scenario analysis",
        "description": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between sensitivity analysis and scenario analysis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity moves one or two lease inputs. A scenario moves several together so a story stays consistent."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/#webpage",
        "name": "How rent-escalation sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/",
        "description": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How rent-escalation sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How rent-escalation sensitivity changes a ranking",
        "description": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does rent-escalation sensitivity change a lease ranking?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/#webpage",
        "name": "How rent-escalation sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/",
        "description": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How rent-escalation sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How rent-escalation sensitivity changes a ranking",
        "description": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does rent-escalation sensitivity change a lease ranking?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A later rent step can flip a winner when the other path stays flatter. Test the bump, do not guess it."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/#webpage",
        "name": "How CAM sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/",
        "description": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM sensitivity changes a ranking",
        "description": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does CAM sensitivity change a lease ranking?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/#webpage",
        "name": "How CAM sensitivity changes a ranking",
        "url": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/",
        "description": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM sensitivity changes a ranking",
            "item": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM sensitivity changes a ranking",
        "description": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does CAM sensitivity change a lease ranking?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/#webpage",
        "name": "Decision risks lease sensitivity reveals",
        "url": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/",
        "description": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Decision risks lease sensitivity reveals",
            "item": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Decision risks lease sensitivity reveals",
        "description": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What decision risks does lease sensitivity reveal?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/#webpage",
        "name": "Decision risks lease sensitivity reveals",
        "url": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/",
        "description": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Decision risks lease sensitivity reveals",
            "item": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Decision risks lease sensitivity reveals",
        "description": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What decision risks does lease sensitivity reveal?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/#webpage",
        "name": "Which assumptions flip a lease ranking",
        "url": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/",
        "description": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Which assumptions flip a lease ranking",
            "item": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Which assumptions flip a lease ranking",
        "description": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Which lease assumptions flip a ranking first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/#webpage",
        "name": "Which assumptions flip a lease ranking",
        "url": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/",
        "description": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Which assumptions flip a lease ranking",
            "item": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Which assumptions flip a lease ranking",
        "description": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Which lease assumptions flip a ranking first?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The rate and early credits usually move first. Escalation and uncapped extras sit close behind."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/#webpage",
        "name": "How occupancy-cost sensitivity changes a location",
        "url": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/",
        "description": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How occupancy-cost sensitivity changes a location",
            "item": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How occupancy-cost sensitivity changes a location",
        "description": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does occupancy-cost sensitivity change a location choice?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor."
            }
          }
        ]
      }
    ]
  },
  "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/#webpage",
        "name": "How occupancy-cost sensitivity changes a location",
        "url": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/",
        "description": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-sensitivity-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How occupancy-cost sensitivity changes a location",
            "item": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How occupancy-cost sensitivity changes a location",
        "description": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor.",
        "mainEntityOfPage": "/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does occupancy-cost sensitivity change a location choice?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a city or a floor."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/lease-abstract-vs-financial-analysis": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/#webpage",
        "name": "Lease abstract vs financial analysis",
        "url": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/",
        "description": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease abstract vs financial analysis",
            "item": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease abstract vs financial analysis",
        "description": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use.",
        "mainEntityOfPage": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between a lease abstract and a financial analysis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/#webpage",
        "name": "Lease abstract vs financial analysis",
        "url": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/",
        "description": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Lease abstract vs financial analysis",
            "item": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Lease abstract vs financial analysis",
        "description": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use.",
        "mainEntityOfPage": "/tenant-rep-analysis/lease-abstract-vs-financial-analysis/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is the difference between a lease abstract and a financial analysis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/common-broker-lease-analysis-mistakes": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/#webpage",
        "name": "Common broker lease-analysis mistakes",
        "url": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/",
        "description": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Common broker lease-analysis mistakes",
            "item": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Common broker lease-analysis mistakes",
        "description": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story.",
        "mainEntityOfPage": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What are common broker lease-analysis mistakes?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/#webpage",
        "name": "Common broker lease-analysis mistakes",
        "url": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/",
        "description": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Common broker lease-analysis mistakes",
            "item": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "Common broker lease-analysis mistakes",
        "description": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story.",
        "mainEntityOfPage": "/tenant-rep-analysis/common-broker-lease-analysis-mistakes/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What are common broker lease-analysis mistakes?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/#webpage",
        "name": "How analysis changes negotiation strategy",
        "url": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/",
        "description": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How analysis changes negotiation strategy",
            "item": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How analysis changes negotiation strategy",
        "description": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does analysis change negotiation strategy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/#webpage",
        "name": "How analysis changes negotiation strategy",
        "url": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/",
        "description": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How analysis changes negotiation strategy",
            "item": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How analysis changes negotiation strategy",
        "description": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does analysis change negotiation strategy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-analysis-supports-lease-negotiation": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/#webpage",
        "name": "How analysis supports lease negotiation",
        "url": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/",
        "description": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How analysis supports lease negotiation",
            "item": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How analysis supports lease negotiation",
        "description": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does analysis support lease negotiation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/#webpage",
        "name": "How analysis supports lease negotiation",
        "url": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/",
        "description": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How analysis supports lease negotiation",
            "item": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How analysis supports lease negotiation",
        "description": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does analysis support lease negotiation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/#webpage",
        "name": "What belongs in a client-facing lease summary",
        "url": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/",
        "description": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a client-facing lease summary",
            "item": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a client-facing lease summary",
        "description": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page.",
        "mainEntityOfPage": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What belongs in a client-facing lease summary?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/#webpage",
        "name": "What belongs in a client-facing lease summary",
        "url": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/",
        "description": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What belongs in a client-facing lease summary",
            "item": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What belongs in a client-facing lease summary",
        "description": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page.",
        "mainEntityOfPage": "/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What belongs in a client-facing lease summary?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/#webpage",
        "name": "How to compare multiple spaces for one client",
        "url": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/",
        "description": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to compare multiple spaces for one client",
            "item": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to compare multiple spaces for one client",
        "description": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare multiple spaces for one client?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method."
            }
          }
        ]
      }
    ]
  },
  "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/#webpage",
        "name": "How to compare multiple spaces for one client",
        "url": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/",
        "description": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/tenant-rep-analysis"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to compare multiple spaces for one client",
            "item": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to compare multiple spaces for one client",
        "description": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method.",
        "mainEntityOfPage": "/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you compare multiple spaces for one client?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/what-is-a-commercial-lease-financial-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/#webpage",
        "name": "What is a commercial lease financial model?",
        "url": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/",
        "description": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is a commercial lease financial model?",
            "item": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is a commercial lease financial model?",
        "description": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel.",
        "mainEntityOfPage": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is a commercial lease financial model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/#webpage",
        "name": "What is a commercial lease financial model?",
        "url": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/",
        "description": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "What is a commercial lease financial model?",
            "item": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "What is a commercial lease financial model?",
        "description": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel.",
        "mainEntityOfPage": "/lease-financial-modeling/what-is-a-commercial-lease-financial-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is a commercial lease financial model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/#webpage",
        "name": "How free rent sits in a lease model",
        "url": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/",
        "description": "Put free rent in the months it actually pays. Do not smear it across every later year by hand.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How free rent sits in a lease model",
            "item": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How free rent sits in a lease model",
        "description": "Put free rent in the months it actually pays. Do not smear it across every later year by hand.",
        "mainEntityOfPage": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should free rent sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put free rent in the months it actually pays. Do not smear it across every later year by hand."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/#webpage",
        "name": "How free rent sits in a lease model",
        "url": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/",
        "description": "Put free rent in the months it actually pays. Do not smear it across every later year by hand.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How free rent sits in a lease model",
            "item": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How free rent sits in a lease model",
        "description": "Put free rent in the months it actually pays. Do not smear it across every later year by hand.",
        "mainEntityOfPage": "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should free rent sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Put free rent in the months it actually pays. Do not smear it across every later year by hand."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/#webpage",
        "name": "How a TI allowance sits in a lease model",
        "url": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/",
        "description": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How a TI allowance sits in a lease model",
            "item": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How a TI allowance sits in a lease model",
        "description": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year.",
        "mainEntityOfPage": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a TI allowance sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/#webpage",
        "name": "How a TI allowance sits in a lease model",
        "url": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/",
        "description": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How a TI allowance sits in a lease model",
            "item": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How a TI allowance sits in a lease model",
        "description": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year.",
        "mainEntityOfPage": "/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a TI allowance sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A TI credit belongs in the year it funds work. It is not a rent cut in every later year."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/#webpage",
        "name": "How rent escalations sit in a lease model",
        "url": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/",
        "description": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How rent escalations sit in a lease model",
            "item": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How rent escalations sit in a lease model",
        "description": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about.",
        "mainEntityOfPage": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should rent escalations sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/#webpage",
        "name": "How rent escalations sit in a lease model",
        "url": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/",
        "description": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How rent escalations sit in a lease model",
            "item": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How rent escalations sit in a lease model",
        "description": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about.",
        "mainEntityOfPage": "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should rent escalations sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/#webpage",
        "name": "How to run scenario analysis in a lease model",
        "url": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/",
        "description": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to run scenario analysis in a lease model",
            "item": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to run scenario analysis in a lease model",
        "description": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you run scenario analysis in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/#webpage",
        "name": "How to run scenario analysis in a lease model",
        "url": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/",
        "description": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to run scenario analysis in a lease model",
            "item": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to run scenario analysis in a lease model",
        "description": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you run scenario analysis in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/#webpage",
        "name": "How to present a lease model to a client",
        "url": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/",
        "description": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to present a lease model to a client",
            "item": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to present a lease model to a client",
        "description": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a lease model be presented to a client?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/#webpage",
        "name": "How to present a lease model to a client",
        "url": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/",
        "description": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How to present a lease model to a client",
            "item": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How to present a lease model to a client",
        "description": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.",
        "mainEntityOfPage": "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should a lease model be presented to a client?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-cam-sits-in-a-lease-model": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/#webpage",
        "name": "How CAM sits in a lease model",
        "url": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/",
        "description": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM sits in a lease model",
            "item": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM sits in a lease model",
        "description": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit.",
        "mainEntityOfPage": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should CAM sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit."
            }
          }
        ]
      }
    ]
  },
  "/lease-financial-modeling/how-cam-sits-in-a-lease-model/": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/#webpage",
        "name": "How CAM sits in a lease model",
        "url": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/",
        "description": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit.",
        "isPartOf": {
          "@id": "/#website"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Home",
            "item": "/lease-financial-modeling"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "How CAM sits in a lease model",
            "item": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": "How CAM sits in a lease model",
        "description": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit.",
        "mainEntityOfPage": "/lease-financial-modeling/how-cam-sits-in-a-lease-model/#webpage"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How should CAM sit in a lease model?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit."
            }
          }
        ]
      }
    ]
  }
};
