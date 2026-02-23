import prisma from '../lib/prisma';

async function checkProducts() {
  try {
    const total = await prisma.product.count();
    const active = await prisma.product.count({ where: { status: 'ACTIVE' } });
    const outOfStock = await prisma.product.count({ where: { status: 'OUT_OF_STOCK' } });
    const inactive = await prisma.product.count({ where: { status: 'INACTIVE' } });
    const discontinued = await prisma.product.count({ where: { status: 'DISCONTINUED' } });

    console.log('total products =', total);
    console.log('ACTIVE =', active);
    console.log('OUT_OF_STOCK =', outOfStock);
    console.log('INACTIVE =', inactive);
    console.log('DISCONTINUED =', discontinued);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts().catch((error) => {
  console.error(error);
  process.exit(1);
});
