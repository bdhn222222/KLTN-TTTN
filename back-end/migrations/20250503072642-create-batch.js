export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("Batches", {
    batch_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    batch_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    },
    medicine_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Medicines",
        key: "medicine_id",
      },
      onDelete: "CASCADE",
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    import_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    expiry_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("Active", "Expired", "Disposed"),
      allowNull: false,
      defaultValue: "Active",
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    },
  });

  // Indexes
  await queryInterface.addIndex("Batches", ["medicine_id"], {
    name: "idx_batch_medicine_id",
  });

  await queryInterface.addIndex("Batches", ["expiry_date"], {
    name: "idx_batch_expiry_date",
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable("Batches");
};
