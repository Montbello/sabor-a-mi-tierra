import { PrismaClient, RoleDomain } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== PERMISSION SCOPES =====
  const scopes = await Promise.all([
    prisma.permissionScope.upsert({
      where: { name: 'public' },
      create: { name: 'public', displayName: 'Public' },
      update: {},
    }),
    prisma.permissionScope.upsert({
      where: { name: 'self' },
      create: { name: 'self', displayName: 'Self Only' },
      update: {},
    }),
    prisma.permissionScope.upsert({
      where: { name: 'own_organization' },
      create: { name: 'own_organization', displayName: 'Own Organization' },
      update: {},
    }),
    prisma.permissionScope.upsert({
      where: { name: 'own_location' },
      create: { name: 'own_location', displayName: 'Own Location' },
      update: {},
    }),
    prisma.permissionScope.upsert({
      where: { name: 'anonymized' },
      create: { name: 'anonymized', displayName: 'Anonymized Data' },
      update: {},
    }),
  ]);
  console.log(`✅ Created ${scopes.length} permission scopes`);

  // ===== PERMISSIONS =====
  const permissions = [
    // Event permissions
    { name: 'event.view', displayName: 'View Events', resource: 'event', action: 'view' },
    { name: 'event.join', displayName: 'Join Events', resource: 'event', action: 'join' },
    { name: 'event.create', displayName: 'Create Events', resource: 'event', action: 'create' },
    { name: 'event.manage', displayName: 'Manage Events', resource: 'event', action: 'manage' },
    
    // Menu permissions
    { name: 'menu.view', displayName: 'View Menus', resource: 'menu', action: 'view' },
    { name: 'menu.create', displayName: 'Create Menus', resource: 'menu', action: 'create' },
    { name: 'menu.update', displayName: 'Update Menus', resource: 'menu', action: 'update' },
    { name: 'menu.manage', displayName: 'Manage Menus', resource: 'menu', action: 'manage' },
    
    // Profile permissions
    { name: 'profile.view', displayName: 'View Profiles', resource: 'profile', action: 'view' },
    { name: 'profile.manage.self', displayName: 'Manage Own Profile', resource: 'profile', action: 'manage' },
    
    // Product permissions
    { name: 'product.view', displayName: 'View Products', resource: 'product', action: 'view' },
    { name: 'product.create', displayName: 'Create Products', resource: 'product', action: 'create' },
    { name: 'product.update', displayName: 'Update Products', resource: 'product', action: 'update' },
    
    // Organization permissions
    { name: 'organization.view', displayName: 'View Organizations', resource: 'organization', action: 'view' },
    { name: 'organization.create', displayName: 'Create Organizations', resource: 'organization', action: 'create' },
    { name: 'organization.update', displayName: 'Update Organizations', resource: 'organization', action: 'update' },
    { name: 'organization.manage', displayName: 'Manage Organizations', resource: 'organization', action: 'manage' },
    { name: 'organization.member.add', displayName: 'Add Members', resource: 'organization', action: 'member.add' },
    { name: 'organization.member.remove', displayName: 'Remove Members', resource: 'organization', action: 'member.remove' },
    
    // Location permissions
    { name: 'location.view', displayName: 'View Locations', resource: 'location', action: 'view' },
    { name: 'location.create', displayName: 'Create Locations', resource: 'location', action: 'create' },
    { name: 'location.manage', displayName: 'Manage Locations', resource: 'location', action: 'manage' },
    
    // Sales instance permissions
    { name: 'sales_instance.view', displayName: 'View Sales Instances', resource: 'sales_instance', action: 'view' },
    { name: 'sales_instance.create', displayName: 'Create Sales Instances', resource: 'sales_instance', action: 'create' },
    { name: 'sales_instance.update', displayName: 'Update Sales Instances', resource: 'sales_instance', action: 'update' },
    
    // CRM permissions
    { name: 'crm.view', displayName: 'View CRM Data', resource: 'crm', action: 'view' },
    
    // Consent & preferences
    { name: 'consent.manage', displayName: 'Manage Consents', resource: 'consent', action: 'manage' },
    { name: 'preferences.manage', displayName: 'Manage Preferences', resource: 'preferences', action: 'manage' },
    
    // Community
    { name: 'community.interact', displayName: 'Community Interaction', resource: 'community', action: 'interact' },
    
    // System
    { name: 'system.admin', displayName: 'System Administration', resource: 'system', action: 'admin' },
  ];

  const createdPermissions: Record<string, { id: string }> = {};
  for (const perm of permissions) {
    const created = await prisma.permission.upsert({
      where: { name: perm.name },
      create: perm,
      update: {},
    });
    createdPermissions[perm.name] = created;
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // ===== ROLES =====
  
  // Consumer Role
  const consumerRole = await prisma.role.upsert({
    where: { name: 'consumer' },
    create: {
      name: 'consumer',
      displayName: 'Consumer',
      description: 'Regular consumer user',
      domain: RoleDomain.CONSUMER,
      isSystem: true,
    },
    update: {},
  });

  // Franchise Owner Role
  const franchiseOwnerRole = await prisma.role.upsert({
    where: { name: 'franchise_owner' },
    create: {
      name: 'franchise_owner',
      displayName: 'Franchise Owner',
      description: 'Owner of a franchise organization',
      domain: RoleDomain.FRANCHISE,
      isSystem: true,
    },
    update: {},
  });

  // Franchise Manager Role
  const franchiseManagerRole = await prisma.role.upsert({
    where: { name: 'franchise_manager' },
    create: {
      name: 'franchise_manager',
      displayName: 'Franchise Manager',
      description: 'Manager within a franchise',
      domain: RoleDomain.FRANCHISE,
      isSystem: true,
    },
    update: {},
  });

  // Operator/Staff Role
  const operatorRole = await prisma.role.upsert({
    where: { name: 'operator' },
    create: {
      name: 'operator',
      displayName: 'Operator / Staff',
      description: 'Operational staff',
      domain: RoleDomain.FRANCHISE,
      isSystem: true,
    },
    update: {},
  });

  // Partner Admin Role
  const partnerAdminRole = await prisma.role.upsert({
    where: { name: 'partner_admin' },
    create: {
      name: 'partner_admin',
      displayName: 'Partner Admin',
      description: 'Partner organization admin',
      domain: RoleDomain.PARTNER,
      isSystem: true,
    },
    update: {},
  });

  // Developer Role
  const developerRole = await prisma.role.upsert({
    where: { name: 'developer' },
    create: {
      name: 'developer',
      displayName: 'Developer',
      description: 'Internal developer',
      domain: RoleDomain.INTERNAL,
      isSystem: true,
    },
    update: {},
  });

  // Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    create: {
      name: 'super_admin',
      displayName: 'Super Admin',
      description: 'Full system access - usage is logged',
      domain: RoleDomain.INTERNAL,
      isSystem: true,
    },
    update: {},
  });

  console.log('✅ Created 7 system roles');

  // ===== ROLE PERMISSIONS =====
  
  // Consumer permissions
  const consumerPerms = ['event.view', 'event.join', 'menu.view', 'profile.manage.self', 'preferences.manage', 'consent.manage', 'community.interact'];
  for (const permName of consumerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId_scopeId: { roleId: consumerRole.id, permissionId: createdPermissions[permName].id, scopeId: null } },
      create: { roleId: consumerRole.id, permissionId: createdPermissions[permName].id },
      update: {},
    });
  }

  // Franchise Owner permissions (organization scope)
  const franchiseOwnerPerms = ['organization.manage', 'organization.member.add', 'organization.member.remove', 'location.manage', 'menu.manage', 'sales_instance.create', 'sales_instance.update', 'product.create', 'product.update', 'event.manage'];
  for (const permName of franchiseOwnerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId_scopeId: { roleId: franchiseOwnerRole.id, permissionId: createdPermissions[permName].id, scopeId: null } },
      create: { roleId: franchiseOwnerRole.id, permissionId: createdPermissions[permName].id },
      update: {},
    });
  }

  // Super Admin permissions (all)
  for (const permName of Object.keys(createdPermissions)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId_scopeId: { roleId: superAdminRole.id, permissionId: createdPermissions[permName].id, scopeId: null } },
      create: { roleId: superAdminRole.id, permissionId: createdPermissions[permName].id },
      update: {},
    });
  }

  console.log('✅ Assigned permissions to roles');

  // ===== EU ALLERGENS =====
  const allergens = [
    { code: 'A', name: 'Gluten', ingredientName: 'Wheat' },
    { code: 'B', name: 'Crustaceans', ingredientName: 'Crustaceans' },
    { code: 'C', name: 'Eggs', ingredientName: 'Eggs' },
    { code: 'D', name: 'Fish', ingredientName: 'Fish' },
    { code: 'E', name: 'Peanuts', ingredientName: 'Peanuts' },
    { code: 'F', name: 'Soybeans', ingredientName: 'Soybeans' },
    { code: 'G', name: 'Milk', ingredientName: 'Milk' },
    { code: 'H', name: 'Nuts', ingredientName: 'Tree Nuts' },
    { code: 'I', name: 'Celery', ingredientName: 'Celery' },
    { code: 'J', name: 'Mustard', ingredientName: 'Mustard' },
    { code: 'K', name: 'Sesame', ingredientName: 'Sesame Seeds' },
    { code: 'L', name: 'Sulphites', ingredientName: 'Sulphites' },
    { code: 'M', name: 'Lupin', ingredientName: 'Lupin' },
    { code: 'N', name: 'Molluscs', ingredientName: 'Molluscs' },
  ];

  for (const allergen of allergens) {
    const ingredient = await prisma.ingredient.upsert({
      where: { name: allergen.ingredientName },
      create: { name: allergen.ingredientName, isAllergen: true },
      update: { isAllergen: true },
    });

    await prisma.allergen.upsert({
      where: { code: allergen.code },
      create: {
        ingredientId: ingredient.id,
        code: allergen.code,
        name: allergen.name,
      },
      update: {},
    });
  }
  console.log('✅ Created 14 EU allergens');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
