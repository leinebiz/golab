import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@golab.co.za',
        name: 'GoLab Admin',
        role: 'GOLAB_ADMIN',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
      {
        email: 'reviewer@golab.co.za',
        name: 'GoLab Reviewer',
        role: 'GOLAB_REVIEWER',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
      {
        email: 'finance@golab.co.za',
        name: 'GoLab Finance',
        role: 'GOLAB_FINANCE',
        organizationId: golab.id,
        emailVerified: new Date(),
      },
    ],
  });

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

  await prisma.user.create({
    data: {
      email: 'christoph@abcmining.co.za',
      name: 'Christoph Leinemann',
      role: 'CUSTOMER_ADMIN',
      organizationId: abcMining.id,
      emailVerified: new Date(),
    },
  });

  await prisma.address.create({
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
      availableCredit: 50000,
      outstandingBalance: 0,
      applicationDate: new Date(),
      reviewedAt: new Date(),
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

  await prisma.user.create({
    data: {
      email: 'admin@xyzfoods.co.za',
      name: 'Jane Smith',
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

  // ── Laboratory: TestLab JHB ─────────────────────────────────
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
      name: 'Lab Manager',
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
      location: { lat: -26.1076, lng: 28.0567, address: '789 Lab Street, Sandton' },
    },
  });

  // ── Laboratory: MetalsLab PTA ───────────────────────────────
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
      location: { lat: -25.7479, lng: 28.2293, address: '321 Mining Road, Pretoria' },
    },
  });

  // ── Laboratory: WaterTech CPT ───────────────────────────────
  const waterTechOrg = await prisma.organization.create({
    data: {
      name: 'WaterTech Cape Town',
      type: 'LABORATORY',
      labContactEmail: 'lab@watertech.co.za',
      labContactPhone: '+27217891234',
      labLocation: { lat: -33.9180, lng: 18.4233 },
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@watertech.co.za',
      name: 'Water Lab Manager',
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
      location: { lat: -33.9180, lng: 18.4233, address: '55 Water Lane, Cape Town' },
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
  // TestLab JHB: Water + Soil tests
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

  // MetalsLab PTA: Materials + Soil tests
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

  // WaterTech CPT: Water + Food tests
  for (const test of tests.filter((t) => ['Water', 'Food'].includes(t.category))) {
    await prisma.labTest.create({
      data: {
        laboratoryId: waterTechCpt.id,
        testCatalogueId: test.id,
        accreditation: test.accreditation,
        labTatDays: test.standardTatDays + 1, // Slightly slower
      },
    });
  }

  // ── Disclaimers ─────────────────────────────────────────────
  await prisma.disclaimer.create({
    data: {
      type: 'CUSTOMER_TERMS',
      version: 1,
      title: 'Terms and Conditions',
      content:
        'By using GoLab services, you agree to the following terms and conditions...',
    },
  });

  await prisma.disclaimer.create({
    data: {
      type: 'CUSTOMER_SAMPLE_HANDLING',
      version: 1,
      title: 'Sample Handling Policy',
      content:
        'All samples must be properly packaged and labeled according to GoLab guidelines...',
    },
  });

  console.log('Seed completed successfully!');
  console.log(`  Organizations: ${await prisma.organization.count()}`);
  console.log(`  Users: ${await prisma.user.count()}`);
  console.log(`  Laboratories: ${await prisma.laboratory.count()}`);
  console.log(`  Test Catalogue: ${await prisma.testCatalogue.count()}`);
  console.log(`  Lab-Test Links: ${await prisma.labTest.count()}`);
  console.log(`  Disclaimers: ${await prisma.disclaimer.count()}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
