import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed bcrypt hash for "Password1!" (cost 10) — shared dev password for all seeded users
const DEV_PASSWORD_HASH = '$2b$10$CQCz2TtUP/wN0eZPZAfc5uGXqy1aK/giVhlmcBPHt5LbW2rORoDA.';

async function main() {
  console.log('Seeding database...');

  // ── GoLab Organization ──────────────────────────────────────
  const golab = await prisma.organization.create({
    data: {
      name: 'GoLab Operations',
      type: 'GOLAB',
      registrationNumber: 'GOL-001',
      paymentType: 'CREDIT',
    },
  });

  // ── GoLab Users ─────────────────────────────────────────────
  const [golabAdmin, golabReviewer, golabFinance] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@golab.co.za',
        name: 'GoLab Admin',
        passwordHash: DEV_PASSWORD_HASH,
        role: 'GOLAB_ADMIN',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'reviewer@golab.co.za',
        name: 'GoLab Reviewer',
        passwordHash: DEV_PASSWORD_HASH,
        role: 'GOLAB_REVIEWER',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'finance@golab.co.za',
        name: 'GoLab Finance',
        passwordHash: DEV_PASSWORD_HASH,
        role: 'GOLAB_FINANCE',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
    }),
  ]);

  // ── Customer: ABC Mining ────────────────────────────────────
  const abcMining = await prisma.organization.create({
    data: {
      name: 'ABC Mining (Pty) Ltd',
      type: 'CUSTOMER',
      registrationNumber: '2020/123456/07',
      vatNumber: '4123456789',
      industry: 'Mining',
      paymentType: 'CREDIT',
    },
  });

  const abcUser = await prisma.user.create({
    data: {
      email: 'christoph@abcmining.co.za',
      name: 'Christoph Leinemann',
      passwordHash: DEV_PASSWORD_HASH,
      role: 'CUSTOMER_ADMIN',
      organizationId: abcMining.id,
      emailVerified: new Date(),
    },
  });

  const abcAddress = await prisma.address.create({
    data: {
      organizationId: abcMining.id,
      type: 'COLLECTION',
      line1: '123 Main Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      isDefault: true,
      location: { lat: -26.2041, lng: 28.0473 },
    },
  });

  await prisma.creditAccount.create({
    data: {
      organizationId: abcMining.id,
      status: 'APPROVED',
      creditLimit: 50000,
      availableCredit: 42500,
      outstandingBalance: 7500,
      applicationDate: new Date(Date.now() - 30 * 24 * 3600000),
      reviewedAt: new Date(Date.now() - 28 * 24 * 3600000),
      reviewedBy: golabFinance.id,
    },
  });

  // ── Customer: XYZ Foods ─────────────────────────────────────
  const xyzFoods = await prisma.organization.create({
    data: {
      name: 'XYZ Foods (Pty) Ltd',
      type: 'CUSTOMER',
      registrationNumber: '2021/654321/07',
      industry: 'Food Manufacturing',
      paymentType: 'COD',
    },
  });

  const xyzUser = await prisma.user.create({
    data: {
      email: 'admin@xyzfoods.co.za',
      name: 'Jane Smith',
      passwordHash: DEV_PASSWORD_HASH,
      role: 'CUSTOMER_ADMIN',
      organizationId: xyzFoods.id,
      emailVerified: new Date(),
    },
  });

  await prisma.address.create({
    data: {
      organizationId: xyzFoods.id,
      type: 'COLLECTION',
      line1: '456 Industrial Avenue',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      isDefault: true,
      location: { lat: -33.9249, lng: 18.4241 },
    },
  });

  // Pending credit application for XYZ
  await prisma.creditAccount.create({
    data: {
      organizationId: xyzFoods.id,
      status: 'PENDING_REVIEW',
      applicationDate: new Date(Date.now() - 2 * 24 * 3600000),
      applicationDocs: {
        companyReg: '2021/654321/07',
        requestedLimit: 25000,
        reason: 'Growing food testing needs for export compliance',
        submittedBy: xyzUser.id,
        submittedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      },
    },
  });

  // ── Laboratories ──────────────────────────────────────────────

  // TestLab JHB
  const testLabOrg = await prisma.organization.create({
    data: {
      name: 'TestLab Johannesburg',
      type: 'LABORATORY',
      labContactEmail: 'lab@testlab.co.za',
      labContactPhone: '+27117891234',
      labLocation: { lat: -26.1076, lng: 28.0567 },
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@testlab.co.za',
      name: 'Lab Manager JHB',
      passwordHash: DEV_PASSWORD_HASH,
      role: 'LAB_ADMIN',
      organizationId: testLabOrg.id,
      emailVerified: new Date(),
    },
  });

  const testLabJhb = await prisma.laboratory.create({
    data: {
      organizationId: testLabOrg.id,
      code: 'LAB-JHB-001',
      name: 'TestLab Johannesburg',
      contactEmail: 'lab@testlab.co.za',
      contactPhone: '+27117891234',
      location: {
        lat: -26.1076,
        lng: 28.0567,
        line1: '789 Lab Street',
        city: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
        country: 'ZA',
      },
    },
  });

  // MetalsLab PTA
  const metalsLabOrg = await prisma.organization.create({
    data: {
      name: 'MetalsLab Pretoria',
      type: 'LABORATORY',
      labContactEmail: 'lab@metalslab.co.za',
      labContactPhone: '+27124561234',
      labLocation: { lat: -25.7479, lng: 28.2293 },
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@metalslab.co.za',
      name: 'Metals Lab Manager',
      passwordHash: DEV_PASSWORD_HASH,
      role: 'LAB_ADMIN',
      organizationId: metalsLabOrg.id,
      emailVerified: new Date(),
    },
  });

  const metalsLabPta = await prisma.laboratory.create({
    data: {
      organizationId: metalsLabOrg.id,
      code: 'LAB-PTA-001',
      name: 'MetalsLab Pretoria',
      contactEmail: 'lab@metalslab.co.za',
      contactPhone: '+27124561234',
      location: {
        lat: -25.7479,
        lng: 28.2293,
        line1: '321 Mining Road',
        city: 'Pretoria',
        province: 'Gauteng',
        postalCode: '0001',
        country: 'ZA',
      },
    },
  });

  // WaterTech CPT
  const waterTechOrg = await prisma.organization.create({
    data: {
      name: 'WaterTech Cape Town',
      type: 'LABORATORY',
      labContactEmail: 'lab@watertech.co.za',
      labContactPhone: '+27217891234',
      labLocation: { lat: -33.918, lng: 18.4233 },
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@watertech.co.za',
      name: 'Water Lab Manager',
      passwordHash: DEV_PASSWORD_HASH,
      role: 'LAB_ADMIN',
      organizationId: waterTechOrg.id,
      emailVerified: new Date(),
    },
  });

  const waterTechCpt = await prisma.laboratory.create({
    data: {
      organizationId: waterTechOrg.id,
      code: 'LAB-CPT-001',
      name: 'WaterTech Cape Town',
      contactEmail: 'lab@watertech.co.za',
      contactPhone: '+27217891234',
      location: {
        lat: -33.918,
        lng: 18.4233,
        line1: '55 Water Lane',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'ZA',
      },
    },
  });

  // ── Test Catalogue ──────────────────────────────────────────
  const tests = await Promise.all([
    prisma.testCatalogue.create({
      data: {
        code: 'TST-WATER-PH',
        name: 'Water pH Analysis',
        category: 'Water',
        accreditation: 'ACCREDITED',
        standardTatDays: 5,
        expeditedTatDays: 2,
        basePrice: 350,
        expediteSurcharge: 175,
        toleranceApplicable: true,
        toleranceUnit: 'pH',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-WATER-EC',
        name: 'Electrical Conductivity',
        category: 'Water',
        accreditation: 'ACCREDITED',
        standardTatDays: 5,
        expeditedTatDays: 2,
        basePrice: 300,
        expediteSurcharge: 150,
        toleranceApplicable: true,
        toleranceUnit: 'mS/m',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-WATER-TURB',
        name: 'Turbidity Test',
        category: 'Water',
        accreditation: 'ACCREDITED',
        standardTatDays: 3,
        expeditedTatDays: 1,
        basePrice: 250,
        expediteSurcharge: 125,
        toleranceApplicable: true,
        toleranceUnit: 'NTU',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-WATER-MICRO',
        name: 'Microbiological Analysis',
        category: 'Water',
        accreditation: 'ACCREDITED',
        standardTatDays: 7,
        expeditedTatDays: 3,
        basePrice: 750,
        expediteSurcharge: 375,
        toleranceApplicable: false,
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-SOIL-PH',
        name: 'Soil pH Analysis',
        category: 'Soil',
        accreditation: 'ACCREDITED',
        standardTatDays: 5,
        basePrice: 400,
        toleranceApplicable: true,
        toleranceUnit: 'pH',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-SOIL-HEAVY',
        name: 'Heavy Metals in Soil',
        category: 'Soil',
        accreditation: 'ACCREDITED',
        standardTatDays: 10,
        expeditedTatDays: 5,
        basePrice: 1200,
        expediteSurcharge: 600,
        toleranceApplicable: true,
        toleranceUnit: 'mg/kg',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-FOOD-MICRO',
        name: 'Food Microbiological Safety',
        category: 'Food',
        accreditation: 'ACCREDITED',
        standardTatDays: 7,
        expeditedTatDays: 3,
        basePrice: 850,
        expediteSurcharge: 425,
        toleranceApplicable: false,
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-FOOD-NUTRI',
        name: 'Nutritional Analysis',
        category: 'Food',
        accreditation: 'NON_ACCREDITED',
        standardTatDays: 10,
        basePrice: 1500,
        toleranceApplicable: false,
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-MAT-TENSILE',
        name: 'Tensile Strength Test',
        category: 'Materials',
        accreditation: 'ACCREDITED',
        standardTatDays: 5,
        expeditedTatDays: 2,
        basePrice: 600,
        expediteSurcharge: 300,
        toleranceApplicable: true,
        toleranceUnit: 'MPa',
      },
    }),
    prisma.testCatalogue.create({
      data: {
        code: 'TST-MAT-HARDNESS',
        name: 'Hardness Test',
        category: 'Materials',
        accreditation: 'ACCREDITED',
        standardTatDays: 3,
        expeditedTatDays: 1,
        basePrice: 450,
        expediteSurcharge: 225,
        toleranceApplicable: true,
        toleranceUnit: 'HRC',
      },
    }),
  ]);

  // ── Lab-Test Capabilities ───────────────────────────────────
  for (const test of tests.filter((t) => ['Water', 'Soil'].includes(t.category))) {
    await prisma.labTest.create({
      data: {
        laboratoryId: testLabJhb.id,
        testCatalogueId: test.id,
        accreditation: test.accreditation,
        labTatDays: test.standardTatDays,
      },
    });
  }

  for (const test of tests.filter((t) => ['Materials', 'Soil'].includes(t.category))) {
    await prisma.labTest.create({
      data: {
        laboratoryId: metalsLabPta.id,
        testCatalogueId: test.id,
        accreditation: test.accreditation,
        labTatDays: test.standardTatDays,
      },
    });
  }

  for (const test of tests.filter((t) => ['Water', 'Food'].includes(t.category))) {
    await prisma.labTest.create({
      data: {
        laboratoryId: waterTechCpt.id,
        testCatalogueId: test.id,
        accreditation: test.accreditation,
        labTatDays: test.standardTatDays + 1,
      },
    });
  }

  // ── Disclaimers ─────────────────────────────────────────────
  const [customerDisclaimer, sampleDisclaimer] = await Promise.all([
    prisma.disclaimer.create({
      data: {
        type: 'CUSTOMER_TERMS',
        version: 1,
        title: 'Terms and Conditions',
        content:
          'By using GoLab services, you agree that: (1) All testing is performed in accordance with the applicable South African and international standards. (2) GoLab (Pty) Ltd is not liable for delays caused by courier service providers. (3) Results are provided on an as-is basis and GoLab makes no warranties beyond the scope of accreditation. (4) Payment terms are 30 days from date of invoice for credit account customers. (5) COD customers must complete payment before testing commences. (6) Sample disposal occurs 30 days after result release unless otherwise arranged.',
      },
    }),
    prisma.disclaimer.create({
      data: {
        type: 'CUSTOMER_SAMPLE_HANDLING',
        version: 1,
        title: 'Sample Handling Policy',
        content:
          'All samples must be properly packaged and labeled according to GoLab guidelines. Samples must include the request reference number on each container. Perishable samples must be shipped in insulated packaging with appropriate cold-chain management. Hazardous materials must be declared and labeled per SANS 10228. GoLab reserves the right to reject improperly packaged or unlabeled samples.',
      },
    }),
  ]);

  // ── Disclaimer Acceptances for ABC Mining ─────────────────
  await prisma.disclaimerAcceptance.createMany({
    data: [
      {
        disclaimerId: customerDisclaimer.id,
        acceptedById: abcUser.id,
        organizationId: abcMining.id,
        acceptedAt: new Date(Date.now() - 25 * 24 * 3600000),
        ipAddress: '192.168.1.100',
      },
      {
        disclaimerId: sampleDisclaimer.id,
        acceptedById: abcUser.id,
        organizationId: abcMining.id,
        acceptedAt: new Date(Date.now() - 25 * 24 * 3600000),
        ipAddress: '192.168.1.100',
      },
    ],
  });

  // ── Sample Request #1: CLOSED (full lifecycle) ────────────
  const waterPh = tests.find((t) => t.code === 'TST-WATER-PH')!;
  const waterEc = tests.find((t) => t.code === 'TST-WATER-EC')!;

  const request1 = await prisma.request.create({
    data: {
      organizationId: abcMining.id,
      createdById: abcUser.id,
      reference: 'REQ-20260301-00001',
      status: 'CLOSED',
      turnaroundType: 'STANDARD',
      collectionAddressId: abcAddress.id,
      specialInstructions: 'Please handle samples with care — temperature sensitive.',
      customerAction: 'ACCEPT_AND_CLOSE',
      customerActionDate: new Date(Date.now() - 5 * 24 * 3600000),
      acceptedAt: new Date(Date.now() - 20 * 24 * 3600000),
      closedAt: new Date(Date.now() - 5 * 24 * 3600000),
    },
  });

  // Quote for request 1
  await prisma.quote.create({
    data: {
      requestId: request1.id,
      quoteNumber: 'QTE-20260301-00001',
      subtotal: 650,
      logisticsCost: 350,
      adminFee: 50,
      vatRate: 0.15,
      vatAmount: 157.5,
      totalAmount: 1207.5,
      isAccepted: true,
      acceptedAt: new Date(Date.now() - 20 * 24 * 3600000),
      expiresAt: new Date(Date.now() + 10 * 24 * 3600000),
      lineItems: [
        {
          testCode: 'TST-WATER-PH',
          testName: 'Water pH Analysis',
          qty: 1,
          unitPrice: 350,
          total: 350,
        },
        {
          testCode: 'TST-WATER-EC',
          testName: 'Electrical Conductivity',
          qty: 1,
          unitPrice: 300,
          total: 300,
        },
      ],
    },
  });

  // Invoice for request 1
  await prisma.invoice.create({
    data: {
      requestId: request1.id,
      invoiceNumber: 'INV-20260301-00001',
      status: 'PAID',
      subtotal: 1050,
      vatAmount: 157.5,
      totalAmount: 1207.5,
      lineItems: [
        {
          testCode: 'TST-WATER-PH',
          testName: 'Water pH Analysis',
          qty: 1,
          unitPrice: 350,
          total: 350,
        },
        {
          testCode: 'TST-WATER-EC',
          testName: 'Electrical Conductivity',
          qty: 1,
          unitPrice: 300,
          total: 300,
        },
        { label: 'Logistics Fee', total: 350 },
        { label: 'Admin Fee', total: 50 },
      ],
      dueDate: new Date(Date.now() + 10 * 24 * 3600000),
      issuedAt: new Date(Date.now() - 20 * 24 * 3600000),
      paidAt: new Date(Date.now() - 18 * 24 * 3600000),
    },
  });

  // Sub-request + tests for request 1
  const subReq1 = await prisma.subRequest.create({
    data: {
      requestId: request1.id,
      subReference: 'REQ-20260301-00001-A',
      laboratoryId: testLabJhb.id,
      status: 'RELEASED_TO_CUSTOMER',
      labAcceptedAt: new Date(Date.now() - 15 * 24 * 3600000),
      labAcceptedBy: 'lab-user',
      testingStartedAt: new Date(Date.now() - 14 * 24 * 3600000),
      testingCompletedAt: new Date(Date.now() - 9 * 24 * 3600000),
      expectedCompletionAt: new Date(Date.now() - 10 * 24 * 3600000),
    },
  });

  await prisma.subRequestTest.createMany({
    data: [
      {
        subRequestId: subReq1.id,
        testCatalogueId: waterPh.id,
        sampleCount: 3,
        accreditationRequired: true,
        unitPrice: 350,
        totalPrice: 350,
      },
      {
        subRequestId: subReq1.id,
        testCatalogueId: waterEc.id,
        sampleCount: 3,
        accreditationRequired: true,
        unitPrice: 300,
        totalPrice: 300,
      },
    ],
  });

  // Waybill for sub-request 1
  await prisma.waybill.create({
    data: {
      subRequestId: subReq1.id,
      waybillNumber: 'WB-20260301-00001',
      courierProvider: 'mock',
      courierBookingId: 'mock-booking-001',
      status: 'DELIVERED',
      collectionAddress: { line1: '123 Main Road', city: 'Johannesburg' },
      deliveryAddress: { line1: '789 Lab Street', city: 'Sandton' },
      estimatedDelivery: new Date(Date.now() - 16 * 24 * 3600000),
      collectedAt: new Date(Date.now() - 17 * 24 * 3600000),
      deliveredAt: new Date(Date.now() - 16 * 24 * 3600000),
      trackingEvents: [
        {
          timestamp: new Date(Date.now() - 18 * 24 * 3600000).toISOString(),
          status: 'BOOKED',
          description: 'Pickup booked',
        },
        {
          timestamp: new Date(Date.now() - 17 * 24 * 3600000).toISOString(),
          status: 'COLLECTED',
          description: 'Sample collected',
        },
        {
          timestamp: new Date(Date.now() - 16 * 24 * 3600000).toISOString(),
          status: 'DELIVERED',
          description: 'Delivered to lab',
        },
      ],
    },
  });

  // Certificate for sub-request 1
  await prisma.certificate.create({
    data: {
      subRequestId: subReq1.id,
      uploadedById: 'lab-user',
      format: 'LAB_ORIGINAL',
      version: 1,
      originalFileKey: 'certificates/REQ-20260301-00001-A/water-analysis.pdf',
      fileName: 'water-analysis.pdf',
      mimeType: 'application/pdf',
      reviewAction: 'APPROVED',
      reviewedById: golabReviewer.id,
      reviewedAt: new Date(Date.now() - 7 * 24 * 3600000),
      releasedAt: new Date(Date.now() - 6 * 24 * 3600000),
    },
  });

  // Status transitions for request 1
  const r1Transitions = [
    { fromStatus: 'DRAFT', toStatus: 'PENDING_CUSTOMER_REVIEW', daysAgo: 22 },
    { fromStatus: 'PENDING_CUSTOMER_REVIEW', toStatus: 'ACCEPTED_BY_CUSTOMER', daysAgo: 20 },
    { fromStatus: 'ACCEPTED_BY_CUSTOMER', toStatus: 'INVOICE_GENERATED', daysAgo: 20 },
    { fromStatus: 'INVOICE_GENERATED', toStatus: 'PAYMENT_RECEIVED', daysAgo: 18 },
    { fromStatus: 'PAYMENT_RECEIVED', toStatus: 'IN_PROGRESS', daysAgo: 17 },
    { fromStatus: 'IN_PROGRESS', toStatus: 'PENDING_CUSTOMER_ACTION', daysAgo: 6 },
    { fromStatus: 'PENDING_CUSTOMER_ACTION', toStatus: 'CLOSED', daysAgo: 5 },
  ];
  for (const t of r1Transitions) {
    await prisma.statusTransition.create({
      data: {
        requestId: request1.id,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        triggeredBy: t.daysAgo > 10 ? abcUser.id : 'system',
        createdAt: new Date(Date.now() - t.daysAgo * 24 * 3600000),
      },
    });
  }

  // ── Sample Request #2: IN_PROGRESS with exception ─────────
  const soilHeavy = tests.find((t) => t.code === 'TST-SOIL-HEAVY')!;

  const request2 = await prisma.request.create({
    data: {
      organizationId: abcMining.id,
      createdById: abcUser.id,
      reference: 'REQ-20260315-00002',
      status: 'IN_PROGRESS',
      turnaroundType: 'EXPEDITED',
      collectionAddressId: abcAddress.id,
      acceptedAt: new Date(Date.now() - 10 * 24 * 3600000),
    },
  });

  await prisma.quote.create({
    data: {
      requestId: request2.id,
      quoteNumber: 'QTE-20260315-00002',
      subtotal: 1800,
      expediteSurcharge: 600,
      logisticsCost: 350,
      adminFee: 50,
      vatRate: 0.15,
      vatAmount: 420,
      totalAmount: 3220,
      isAccepted: true,
      acceptedAt: new Date(Date.now() - 10 * 24 * 3600000),
      expiresAt: new Date(Date.now() + 20 * 24 * 3600000),
      lineItems: [
        {
          testCode: 'TST-SOIL-HEAVY',
          testName: 'Heavy Metals in Soil',
          qty: 2,
          unitPrice: 1200,
          total: 1800,
        },
      ],
    },
  });

  await prisma.invoice.create({
    data: {
      requestId: request2.id,
      invoiceNumber: 'INV-20260315-00002',
      status: 'PAID',
      subtotal: 2800,
      vatAmount: 420,
      totalAmount: 3220,
      lineItems: [],
      dueDate: new Date(Date.now() + 20 * 24 * 3600000),
      issuedAt: new Date(Date.now() - 10 * 24 * 3600000),
      paidAt: new Date(Date.now() - 9 * 24 * 3600000),
    },
  });

  const subReq2 = await prisma.subRequest.create({
    data: {
      requestId: request2.id,
      subReference: 'REQ-20260315-00002-A',
      laboratoryId: metalsLabPta.id,
      status: 'SAMPLE_EXCEPTION_LOGGED',
      labAcceptedAt: new Date(Date.now() - 5 * 24 * 3600000),
      labAcceptedBy: 'lab-user',
      testingStartedAt: new Date(Date.now() - 4 * 24 * 3600000),
    },
  });

  await prisma.subRequestTest.create({
    data: {
      subRequestId: subReq2.id,
      testCatalogueId: soilHeavy.id,
      sampleCount: 5,
      accreditationRequired: true,
      unitPrice: 1200,
      totalPrice: 1800,
    },
  });

  // Sample exception for request 2
  await prisma.sampleIssue.create({
    data: {
      subRequestId: subReq2.id,
      reportedById: 'lab-user',
      issueType: 'INSUFFICIENT_SAMPLE',
      comments:
        'Only 3 of 5 soil samples received. Containers labeled #4 and #5 were missing from the shipment. Lab cannot proceed with full testing scope.',
    },
  });

  // ── Sample Request #3: PENDING_CUSTOMER_REVIEW (new quote) ──
  const foodMicro = tests.find((t) => t.code === 'TST-FOOD-MICRO')!;

  const request3 = await prisma.request.create({
    data: {
      organizationId: xyzFoods.id,
      createdById: xyzUser.id,
      reference: 'REQ-20260325-00003',
      status: 'PENDING_CUSTOMER_REVIEW',
      turnaroundType: 'STANDARD',
    },
  });

  await prisma.quote.create({
    data: {
      requestId: request3.id,
      quoteNumber: 'QTE-20260325-00003',
      subtotal: 850,
      logisticsCost: 350,
      adminFee: 50,
      vatRate: 0.15,
      vatAmount: 187.5,
      totalAmount: 1437.5,
      expiresAt: new Date(Date.now() + 14 * 24 * 3600000),
      lineItems: [
        {
          testCode: 'TST-FOOD-MICRO',
          testName: 'Food Microbiological Safety',
          qty: 1,
          unitPrice: 850,
          total: 850,
        },
      ],
    },
  });

  // Sub-request pre-allocated for request 3
  await prisma.subRequest.create({
    data: {
      requestId: request3.id,
      subReference: 'REQ-20260325-00003-A',
      laboratoryId: waterTechCpt.id,
      status: 'PICKUP_REQUESTED',
    },
  });

  await prisma.subRequestTest.create({
    data: {
      subRequestId: (await prisma.subRequest.findFirst({ where: { requestId: request3.id } }))!.id,
      testCatalogueId: foodMicro.id,
      sampleCount: 2,
      accreditationRequired: true,
      unitPrice: 850,
      totalPrice: 850,
    },
  });

  // ── Default Tolerances for ABC Mining ─────────────────────
  await prisma.defaultTolerance.createMany({
    data: [
      {
        organizationId: abcMining.id,
        testCatalogueId: waterPh.id,
        minValue: 6.5,
        maxValue: 8.5,
        unit: 'pH',
        notes: 'SANS 241 drinking water standard',
      },
      {
        organizationId: abcMining.id,
        testCatalogueId: waterEc.id,
        minValue: 0,
        maxValue: 170,
        unit: 'mS/m',
        notes: 'SANS 241 drinking water standard',
      },
    ],
  });

  // ── Notifications (portal) ────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: abcUser.id,
        channel: 'PORTAL',
        type: 'results.ready',
        title: 'Results Ready',
        body: 'Test results for request REQ-20260301-00001 are now available in the portal.',
        status: 'DELIVERED',
        readAt: new Date(Date.now() - 5 * 24 * 3600000),
        sentAt: new Date(Date.now() - 6 * 24 * 3600000),
        requestId: request1.id,
        metadata: { requestRef: 'REQ-20260301-00001' },
      },
      {
        userId: abcUser.id,
        channel: 'PORTAL',
        type: 'sample.exception',
        title: 'Sample Issue Reported',
        body: 'An issue was reported with samples for request REQ-20260315-00002.',
        status: 'DELIVERED',
        sentAt: new Date(Date.now() - 3 * 24 * 3600000),
        requestId: request2.id,
        metadata: { requestRef: 'REQ-20260315-00002' },
      },
      {
        userId: xyzUser.id,
        channel: 'PORTAL',
        type: 'quote.ready',
        title: 'Quote Ready for Review',
        body: 'Your quote for request REQ-20260325-00003 is ready.',
        status: 'DELIVERED',
        sentAt: new Date(Date.now() - 1 * 24 * 3600000),
        requestId: request3.id,
        metadata: { requestRef: 'REQ-20260325-00003' },
      },
      {
        userId: golabAdmin.id,
        channel: 'PORTAL',
        type: 'credit.submitted',
        title: 'Credit Application Submitted',
        body: 'Credit application for XYZ Foods (Pty) Ltd has been submitted.',
        status: 'DELIVERED',
        sentAt: new Date(Date.now() - 2 * 24 * 3600000),
        metadata: { organizationName: 'XYZ Foods (Pty) Ltd' },
      },
    ],
  });

  // ── Audit Log entries ─────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: abcUser.id,
        action: 'CREATE',
        entityType: 'Request',
        entityId: request1.id,
        changes: { status: 'DRAFT', reference: 'REQ-20260301-00001' },
        createdAt: new Date(Date.now() - 22 * 24 * 3600000),
      },
      {
        actorId: golabReviewer.id,
        action: 'UPDATE',
        entityType: 'Certificate',
        entityId: subReq1.id,
        changes: { reviewAction: 'APPROVED' },
        createdAt: new Date(Date.now() - 7 * 24 * 3600000),
      },
    ],
  });

  console.log('Seed completed successfully!');
  console.log(`  Organizations: ${await prisma.organization.count()}`);
  console.log(`  Users: ${await prisma.user.count()}`);
  console.log(`  Laboratories: ${await prisma.laboratory.count()}`);
  console.log(`  Test Catalogue: ${await prisma.testCatalogue.count()}`);
  console.log(`  Lab-Test Links: ${await prisma.labTest.count()}`);
  console.log(`  Disclaimers: ${await prisma.disclaimer.count()}`);
  console.log(`  Requests: ${await prisma.request.count()}`);
  console.log(`  Sub-Requests: ${await prisma.subRequest.count()}`);
  console.log(`  Quotes: ${await prisma.quote.count()}`);
  console.log(`  Invoices: ${await prisma.invoice.count()}`);
  console.log(`  Waybills: ${await prisma.waybill.count()}`);
  console.log(`  Certificates: ${await prisma.certificate.count()}`);
  console.log(`  Sample Issues: ${await prisma.sampleIssue.count()}`);
  console.log(`  Notifications: ${await prisma.notification.count()}`);
  console.log(`  Status Transitions: ${await prisma.statusTransition.count()}`);
  console.log(`  Audit Logs: ${await prisma.auditLog.count()}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
