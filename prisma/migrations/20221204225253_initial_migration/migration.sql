-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('DEFAULT', 'HIDDEN', 'DO_NOT_DISTURB');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('ONGOING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PRIVATE', 'PUBLIC', 'PROTECTED');

-- CreateEnum
CREATE TYPE "ChannelUserStatus" AS ENUM ('REQUESTED', 'INVITED', 'BANNED', 'MEMBER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "intra_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "exp" INTEGER NOT NULL,
    "two_factor_auth_enabled" BOOLEAN NOT NULL,
    "two_factor_auth_secret" TEXT,
    "two_factor_auth_recovery_codes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "read_receipt" BOOLEAN NOT NULL,
    "status" "UserStatus" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direct_message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "unsent" BOOLEAN NOT NULL,

    CONSTRAINT "Direct_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game_mode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_mode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "player_one_id" INTEGER NOT NULL,
    "player_two_id" INTEGER NOT NULL,
    "game_mode_id" INTEGER NOT NULL,
    "player_one_score" INTEGER NOT NULL,
    "player_two_score" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "icon_url" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel_user" (
    "user_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "status" "ChannelUserStatus" NOT NULL,
    "muted_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_user_pkey" PRIMARY KEY ("user_id","channel_id")
);

-- CreateTable
CREATE TABLE "Channel_message" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsent" BOOLEAN NOT NULL,

    CONSTRAINT "Channel_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "User_intra_id_key" ON "User"("intra_id");

-- CreateIndex
CREATE UNIQUE INDEX "Game_mode_name_key" ON "Game_mode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");

-- AddForeignKey
ALTER TABLE "Direct_message" ADD CONSTRAINT "Direct_message_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direct_message" ADD CONSTRAINT "Direct_message_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player_one_id_fkey" FOREIGN KEY ("player_one_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player_two_id_fkey" FOREIGN KEY ("player_two_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_game_mode_id_fkey" FOREIGN KEY ("game_mode_id") REFERENCES "Game_mode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel_user" ADD CONSTRAINT "Channel_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel_user" ADD CONSTRAINT "Channel_user_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel_message" ADD CONSTRAINT "Channel_message_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel_message" ADD CONSTRAINT "Channel_message_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
