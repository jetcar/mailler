using Mailler.Api.Models;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Mailler.Api.Data;

public sealed class MaillerDbContext(DbContextOptions<MaillerDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<EmailAccount> EmailAccounts => Set<EmailAccount>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<Setting> Settings => Set<Setting>();

    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OidcSub).HasColumnName("oidc_sub").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(255);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(x => x.OidcSub).IsUnique().HasDatabaseName("idx_users_oidc_sub");
            entity.HasIndex(x => x.Email).HasDatabaseName("idx_users_email");
        });

        modelBuilder.Entity<EmailAccount>(entity =>
        {
            entity.ToTable("email_accounts");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.EmailAddress).HasColumnName("email_address").HasMaxLength(255).IsRequired();
            entity.Property(x => x.IsDefault).HasColumnName("is_default");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(x => x.UserId).HasDatabaseName("idx_email_accounts_user_id");
            entity.HasIndex(x => x.EmailAddress).HasDatabaseName("idx_email_accounts_email");

            entity.HasOne(x => x.User)
                .WithMany(x => x.EmailAccounts)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.AccountId).HasColumnName("account_id");
            entity.Property(x => x.MessageId).HasColumnName("message_id").HasMaxLength(500);
            entity.Property(x => x.FromAddress).HasColumnName("from_address");
            entity.Property(x => x.ToAddresses).HasColumnName("to_addresses");
            entity.Property(x => x.CcAddresses).HasColumnName("cc_addresses");
            entity.Property(x => x.Subject).HasColumnName("subject");
            entity.Property(x => x.BodyText).HasColumnName("body_text");
            entity.Property(x => x.BodyHtml).HasColumnName("body_html");
            entity.Property(x => x.ReceivedDate).HasColumnName("received_date");
            entity.Property(x => x.IsRead).HasColumnName("is_read");
            entity.Property(x => x.IsStarred).HasColumnName("is_starred");
            entity.Property(x => x.Folder).HasColumnName("folder").HasMaxLength(100);
            entity.Property(x => x.RawHeaders).HasColumnName("raw_headers").HasColumnType("jsonb");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(x => x.AccountId).HasDatabaseName("idx_messages_account_id");
            entity.HasIndex(x => x.MessageId).HasDatabaseName("idx_messages_message_id");
            entity.HasIndex(x => x.Folder).HasDatabaseName("idx_messages_folder");
            entity.HasIndex(x => x.ReceivedDate).HasDatabaseName("idx_messages_received_date");
            entity.HasIndex(x => x.IsRead).HasDatabaseName("idx_messages_is_read");

            entity.HasOne(x => x.Account)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Setting>(entity =>
        {
            entity.ToTable("settings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Key).HasColumnName("key").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Value).HasColumnName("value").HasColumnType("jsonb");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(x => x.UserId).HasDatabaseName("idx_settings_user_id");
            entity.HasIndex(x => x.Key).HasDatabaseName("idx_settings_key");
            entity.HasIndex(x => new { x.UserId, x.Key }).IsUnique();

            entity.HasOne(x => x.User)
                .WithMany(x => x.Settings)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DataProtectionKey>(entity =>
        {
            entity.ToTable("data_protection_keys");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FriendlyName).HasColumnName("friendly_name");
            entity.Property(x => x.Xml).HasColumnName("xml");
        });
    }
}